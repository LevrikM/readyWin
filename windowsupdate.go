package main

import (
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sys/windows/registry"
)

type WindowsUpdateState struct {
	CheckedAt    string `json:"checkedAt"`
	Edition      string `json:"edition,omitempty"`
	DisplayVer   string `json:"displayVersion,omitempty"`
	Build        string `json:"build,omitempty"`
	Activation   string `json:"activation,omitempty"`
	LicenseName  string `json:"licenseName,omitempty"`
	LicenseKind  string `json:"licenseKind,omitempty"`
	LicenseDays  int    `json:"licenseDays,omitempty"`
	LatestHotfix string `json:"latestHotfix,omitempty"`
	HotfixDate   string `json:"hotfixDate,omitempty"`
	Paused       bool   `json:"paused"`
	PausedUntil  string `json:"pausedUntil,omitempty"`
	PauseDays    int    `json:"pauseDays,omitempty"`
	Error        string `json:"error,omitempty"`
}

const (
	windowsUpdateCacheTTL = 2 * time.Minute
	windowsUpdateKey      = `SOFTWARE\Microsoft\WindowsUpdate\UX\Settings`
)

var (
	windowsUpdateMu    sync.Mutex
	windowsUpdateCache WindowsUpdateState
	windowsUpdateAt    time.Time
)

func (a *App) GetWindowsUpdate(force bool) WindowsUpdateState {
	windowsUpdateMu.Lock()
	defer windowsUpdateMu.Unlock()
	if !force && !windowsUpdateAt.IsZero() && time.Since(windowsUpdateAt) < windowsUpdateCacheTTL {
		return windowsUpdateCache
	}
	state := collectWindowsUpdate()
	windowsUpdateCache = state
	windowsUpdateAt = time.Now()
	return state
}

func collectWindowsUpdate() WindowsUpdateState {
	state := WindowsUpdateState{CheckedAt: time.Now().Format(time.RFC3339)}

	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, registry.QUERY_VALUE); err == nil {
		state.Edition, _, _ = key.GetStringValue("ProductName")
		state.DisplayVer, _, _ = key.GetStringValue("DisplayVersion")
		state.Build, _, _ = key.GetStringValue("CurrentBuild")
		if ubr, _, err := key.GetIntegerValue("UBR"); err == nil && ubr > 0 {
			state.Build = state.Build + "." + strconv.FormatUint(uint64(ubr), 10)
		}
		if major := strings.SplitN(state.Build, ".", 2)[0]; major != "" {
			if buildNumber, err := strconv.Atoi(major); err == nil && buildNumber >= 22000 {
				state.Edition = strings.Replace(state.Edition, "Windows 10", "Windows 11", 1)
			}
		}
		key.Close()
	}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		license, err := readActivationPowerShell(15 * time.Second)
		if err != nil {
			license, err = readActivationPowerShell(15 * time.Second)
		}
		if err != nil {
			state.Error = err.Error()
			return
		}
		state.LicenseName = license.Name
		state.LicenseKind = license.Kind
		state.LicenseDays = license.Days
		if license.Status == 1 {
			state.Activation = "licensed"
		} else if license.Status != 0 {
			state.Activation = "unlicensed"
		}
	}()
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`try {
  $h = Get-CimInstance Win32_QuickFixEngineering -ErrorAction Stop | Sort-Object InstalledOn -Descending | Select-Object -First 1
  if ($h) {
    [pscustomobject]@{id=[string]$h.HotFixID; date=$(if ($h.InstalledOn -is [datetime]) { $h.InstalledOn.ToUniversalTime().ToString('o') } else { [string]$h.InstalledOn })} | ConvertTo-Json -Compress
  } else { '{}' }
} catch { '{}' }`, 12*time.Second)
		if err != nil {
			return
		}
		var hotfix psHotfix
		if decodeJSONObject(out, &hotfix) != nil {
			return
		}
		state.LatestHotfix = hotfix.ID
		state.HotfixDate = hotfix.Date
	}()
	wg.Wait()

	state.LicenseKind = strings.TrimSpace(state.LicenseKind)
	pause, until := readPauseState()
	state.Paused = pause
	state.PausedUntil = until
	if pause {
		if parsed, ok := parseHealthDate(until); ok {
			days := int(time.Until(parsed).Hours()/24) + 1
			if days > 0 {
				state.PauseDays = days
			}
		}
	}
	return state
}

func readPauseState() (bool, string) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, windowsUpdateKey, registry.QUERY_VALUE)
	if err != nil {
		return false, ""
	}
	defer key.Close()
	names := []string{
		"PauseUpdatesExpiryTime",
		"PauseFeatureUpdatesEndTime",
		"PauseQualityUpdatesEndTime",
	}
	now := time.Now()
	paused := false
	var furthest time.Time
	var furthestText string
	for _, name := range names {
		value, _, err := key.GetStringValue(name)
		if err != nil || strings.TrimSpace(value) == "" {
			continue
		}
		parsed, ok := parseHealthDate(value)
		if !ok {
			continue
		}
		if parsed.After(now) {
			paused = true
		}
		if parsed.After(furthest) {
			furthest = parsed
			furthestText = value
		}
	}
	if !paused {
		return false, ""
	}
	return true, furthestText
}

// PauseWindowsUpdates writes the same pause window Windows Settings uses. A
// pause is limited to five weeks by Windows itself, so only 7, 14 and 35 days
// are accepted here.
func (a *App) PauseWindowsUpdates(days int) (WindowsUpdateState, error) {
	if days != 7 && days != 14 && days != 35 {
		return WindowsUpdateState{}, fmt.Errorf("некоректний термін паузи: %d", days)
	}
	script := fmt.Sprintf(`$ErrorActionPreference = 'Stop'
$key = 'HKLM:\%s'
if (-not (Test-Path -LiteralPath $key)) { New-Item -Path $key -Force | Out-Null }
$start = (Get-Date).ToUniversalTime()
$end = $start.AddDays(%d)
$startText = $start.ToString('yyyy-MM-ddTHH:mm:ssZ')
$endText = $end.ToString('yyyy-MM-ddTHH:mm:ssZ')
foreach ($name in @('PauseUpdatesStartTime','PauseFeatureUpdatesStartTime','PauseQualityUpdatesStartTime')) {
  Set-ItemProperty -LiteralPath $key -Name $name -Value $startText -Type String
}
foreach ($name in @('PauseUpdatesExpiryTime','PauseFeatureUpdatesEndTime','PauseQualityUpdatesEndTime')) {
  Set-ItemProperty -LiteralPath $key -Name $name -Value $endText -Type String
}`, windowsUpdateKey, days)
	if err := runElevatedPowerShell("pause-updates", script, 60*time.Second); err != nil {
		return WindowsUpdateState{}, err
	}
	a.invalidateWindowsUpdate()
	return a.GetWindowsUpdate(true), nil
}

func (a *App) ResumeWindowsUpdates() (WindowsUpdateState, error) {
	script := fmt.Sprintf(`$ErrorActionPreference = 'Stop'
$key = 'HKLM:\%s'
if (Test-Path -LiteralPath $key) {
  foreach ($name in @('PauseUpdatesStartTime','PauseUpdatesExpiryTime','PauseFeatureUpdatesStartTime','PauseFeatureUpdatesEndTime','PauseQualityUpdatesStartTime','PauseQualityUpdatesEndTime')) {
    Remove-ItemProperty -LiteralPath $key -Name $name -ErrorAction SilentlyContinue
  }
}`, windowsUpdateKey)
	if err := runElevatedPowerShell("resume-updates", script, 60*time.Second); err != nil {
		return WindowsUpdateState{}, err
	}
	a.invalidateWindowsUpdate()
	return a.GetWindowsUpdate(true), nil
}

func (a *App) invalidateWindowsUpdate() {
	windowsUpdateMu.Lock()
	windowsUpdateAt = time.Time{}
	windowsUpdateMu.Unlock()
}
