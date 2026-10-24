package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"golang.org/x/sys/windows/registry"
)

// HealthItem is a single read-only diagnostic row. Status is intentionally
// transport-neutral (ok/warn/bad/unknown/info/na); the UI translates it.
type HealthItem struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Value  string `json:"value,omitempty"`
	Detail string `json:"detail,omitempty"`
}

type DiskHealth struct {
	Name        string  `json:"name"`
	Media       string  `json:"media"`
	Health      string  `json:"health"`
	Operational string  `json:"operational"`
	SizeGB      float64 `json:"sizeGb"`
	Wear        *int    `json:"wear,omitempty"`
	Temperature *int    `json:"temperature,omitempty"`
}

type HealthReport struct {
	CheckedAt     string       `json:"checkedAt"`
	DurationMs    int          `json:"durationMs"`
	Items         []HealthItem `json:"items"`
	Disks         []DiskHealth `json:"disks"`
	Elevated      bool         `json:"elevated,omitempty"`
	ElevatedError string       `json:"elevatedError,omitempty"`
	Error         string       `json:"error,omitempty"`
}

const healthCacheTTL = 30 * time.Second

var (
	healthMu    sync.Mutex
	healthCache HealthReport
	healthAt    time.Time
)

func (a *App) GetHealth(force bool) HealthReport {
	healthMu.Lock()
	defer healthMu.Unlock()
	if !force && !healthAt.IsZero() && time.Since(healthAt) < healthCacheTTL {
		return healthCache
	}
	report := collectHealth()
	healthCache = report
	healthAt = time.Now()
	return report
}

func (a *App) GetHealthElevated() HealthReport {
	base := a.GetHealth(false)
	started := time.Now()
	elevated, err := collectElevatedHealth()
	if err != nil {
		base.ElevatedError = err.Error()
		return base
	}
	merged := mergeElevatedHealth(base, elevated)
	merged.DurationMs = base.DurationMs + int(time.Since(started).Milliseconds())
	healthMu.Lock()
	healthCache = merged
	healthAt = time.Now()
	healthMu.Unlock()
	return merged
}

type psElevatedHealth struct {
	Disks     []psDisk    `json:"disks"`
	BitLocker psBitLocker `json:"bitlocker"`
}

func collectElevatedHealth() (psElevatedHealth, error) {
	var result psElevatedHealth
	baseDir, err := dataDir()
	if err != nil {
		return result, err
	}
	dir := filepath.Join(baseDir, "elevated")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return result, err
	}
	file, err := os.CreateTemp(dir, "health-*.json")
	if err != nil {
		return result, err
	}
	path := file.Name()
	_ = file.Close()
	_ = os.Remove(path)
	defer os.Remove(path)

	script := fmt.Sprintf(`$path = %s
$rows = @()
try {
  foreach ($d in (Get-PhysicalDisk -ErrorAction Stop)) {
    $wear = $null; $temp = $null
    try { $c = $d | Get-StorageReliabilityCounter -ErrorAction Stop; $wear = $c.Wear; $temp = $c.Temperature } catch {}
    $rows += [pscustomobject]@{name=[string]$d.FriendlyName; media=[string]$d.MediaType; health=[string]$d.HealthStatus; operational=[string]($d.OperationalStatus -join ','); size=[double]$d.Size; wear=$wear; temperature=$temp}
  }
} catch {}
$bl = $null
try {
  $v = Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction Stop
  $bl = [pscustomobject]@{status=[string]$v.ProtectionStatus; pct=[int]$v.EncryptionPercentage; method=[string]$v.EncryptionMethod}
} catch {}
[pscustomobject]@{disks=$rows; bitlocker=$bl} | ConvertTo-Json -Compress -Depth 4 | Set-Content -LiteralPath $path -Encoding UTF8`, psQuote(path))
	if err := runElevatedPowerShell("health", script, 45*time.Second); err != nil {
		return result, err
	}
	out, err := os.ReadFile(path)
	if err != nil {
		return result, errors.New("розширена діагностика не повернула результат")
	}
	if err := decodeJSONObject(out, &result); err != nil {
		return result, err
	}
	return result, nil
}

func mergeElevatedHealth(base HealthReport, elevated psElevatedHealth) HealthReport {
	base.Elevated = true
	base.ElevatedError = ""
	base.CheckedAt = time.Now().Format(time.RFC3339)
	if len(elevated.Disks) > 0 {
		base.Error = ""
		for _, disk := range elevated.Disks {
			health := diskHealth(disk)
			replaced := false
			for index := range base.Disks {
				if strings.EqualFold(base.Disks[index].Name, health.Name) {
					base.Disks[index] = health
					replaced = true
					break
				}
			}
			if !replaced {
				base.Disks = append(base.Disks, health)
			}
		}
	}
	if elevated.BitLocker.Status != "" {
		item := bitlockerHealthItem(elevated.BitLocker)
		replaced := false
		for index := range base.Items {
			if base.Items[index].ID == "bitlocker" {
				base.Items[index] = item
				replaced = true
				break
			}
		}
		if !replaced {
			base.Items = append(base.Items, item)
		}
	}
	return base
}

func diskHealth(disk psDisk) DiskHealth {
	return DiskHealth{
		Name:        disk.Name,
		Media:       strings.ToLower(disk.Media),
		Health:      strings.ToLower(disk.Health),
		Operational: disk.Operational,
		SizeGB:      float64(disk.Size) / (1 << 30),
		Wear:        disk.Wear,
		Temperature: disk.Temperature,
	}
}

func bitlockerHealthItem(bitlocker psBitLocker) HealthItem {
	status := "unknown"
	value := "unknown"
	if bitlocker.Status != "" {
		value = strings.ToLower(bitlocker.Status)
		switch value {
		case "on":
			status = "ok"
		case "off":
			status = "warn"
		}
	}
	return HealthItem{ID: "bitlocker", Status: status, Value: value, Detail: strings.TrimSpace(bitlocker.Method)}
}

type psDisk struct {
	Name        string  `json:"name"`
	Media       string  `json:"media"`
	Health      string  `json:"health"`
	Operational string  `json:"operational"`
	Size        float64 `json:"size"`
	Wear        *int    `json:"wear"`
	Temperature *int    `json:"temperature"`
}

type psDefender struct {
	Antivirus bool   `json:"antivirus"`
	Realtime  bool   `json:"realtime"`
	Signature string `json:"signature"`
	Age       int    `json:"age"`
	Tamper    bool   `json:"tamper"`
}

type psBitLocker struct {
	Status string `json:"status"`
	Pct    int    `json:"pct"`
	Method string `json:"method"`
}

type psActivation struct {
	Status int    `json:"status"`
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Days   int    `json:"days"`
}

type psBattery struct {
	Present bool `json:"present"`
	Charge  int  `json:"charge"`
	Status  int  `json:"status"`
	Full    *int `json:"full"`
	Design  *int `json:"design"`
}

type psRestore struct {
	Time string `json:"time"`
	Desc string `json:"desc"`
}

type psHotfix struct {
	ID   string `json:"id"`
	Date string `json:"date"`
}

func collectHealth() HealthReport {
	started := time.Now()
	report := HealthReport{CheckedAt: started.Format(time.RFC3339), Items: []HealthItem{}, Disks: []DiskHealth{}}

	var (
		wg         sync.WaitGroup
		disks      []psDisk
		defender   psDefender
		bitlocker  psBitLocker
		activation psActivation
		battery    psBattery
		restore    psRestore
		hotfix     psHotfix
		disksErr   error
		defendErr  error
		bitErr     error
		actErr     error
		battErr    error
		restoreErr error
		hotfixErr  error
	)
	wg.Add(7)
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`$rows = @()
try {
  foreach ($d in (Get-PhysicalDisk -ErrorAction Stop)) {
    $wear = $null; $temp = $null
    try { $c = $d | Get-StorageReliabilityCounter -ErrorAction Stop; $wear = $c.Wear; $temp = $c.Temperature } catch {}
    $rows += [pscustomobject]@{name=[string]$d.FriendlyName; media=[string]$d.MediaType; health=[string]$d.HealthStatus; operational=[string]($d.OperationalStatus -join ','); size=[double]$d.Size; wear=$wear; temperature=$temp}
  }
} catch {}
ConvertTo-Json -InputObject $rows -Compress -Depth 3`, 9*time.Second)
		if err == nil {
			disksErr = decodeJSONArray(out, &disks)
		} else {
			disksErr = err
		}
	}()
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`try { $s = Get-MpComputerStatus -ErrorAction Stop; [pscustomobject]@{antivirus=[bool]$s.AntivirusEnabled; realtime=[bool]$s.RealTimeProtectionEnabled; signature=[string]$s.AntivirusSignatureVersion; age=[int]$s.AntivirusSignatureAge; tamper=[bool]$s.IsTamperProtected} | ConvertTo-Json -Compress } catch { '{}' }`, 9*time.Second)
		if err == nil {
			defendErr = decodeJSONObject(out, &defender)
		} else {
			defendErr = err
		}
	}()
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`try { $v = Get-BitLockerVolume -MountPoint $env:SystemDrive -ErrorAction Stop; [pscustomobject]@{status=[string]$v.ProtectionStatus; pct=[int]$v.EncryptionPercentage; method=[string]$v.EncryptionMethod} | ConvertTo-Json -Compress } catch { '{}' }`, 6*time.Second)
		if err == nil {
			bitErr = decodeJSONObject(out, &bitlocker)
		} else {
			bitErr = err
		}
	}()
	go func() {
		defer wg.Done()
		activation, actErr = readActivationPowerShell(15 * time.Second)
		if actErr != nil {
			activation, actErr = readActivationPowerShell(15 * time.Second)
		}
	}()
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`try {
  $b = Get-CimInstance Win32_Battery -ErrorAction Stop | Select-Object -First 1
  if ($b) {
    $full = $null; $design = $null
    try { $full = (Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity -ErrorAction Stop | Select-Object -First 1).FullChargedCapacity } catch {}
    try { $design = (Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData -ErrorAction Stop | Select-Object -First 1).DesignedCapacity } catch {}
    [pscustomobject]@{present=$true; charge=[int]$b.EstimatedChargeRemaining; status=[int]$b.BatteryStatus; full=$full; design=$design} | ConvertTo-Json -Compress
  } else { '{"present":false}' }
} catch { '{"present":false}' }`, 8*time.Second)
		if err == nil {
			battErr = decodeJSONObject(out, &battery)
		} else {
			battErr = err
		}
	}()
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`try { $r = Get-CimInstance -Namespace root/default -ClassName SystemRestore -ErrorAction Stop | Sort-Object CreationTime -Descending | Select-Object -First 1; if ($r) { [pscustomobject]@{time=$(if ($r.CreationTime -is [datetime]) { $r.CreationTime.ToUniversalTime().ToString('o') } else { [string]$r.CreationTime }); desc=[string]$r.Description} | ConvertTo-Json -Compress } else { '{}' } } catch { '{}' }`, 9*time.Second)
		if err == nil {
			restoreErr = decodeJSONObject(out, &restore)
		} else {
			restoreErr = err
		}
	}()
	go func() {
		defer wg.Done()
		out, err := runPowerShell(`try { $h = Get-CimInstance Win32_QuickFixEngineering -ErrorAction Stop | Sort-Object InstalledOn -Descending | Select-Object -First 1; if ($h) { [pscustomobject]@{id=[string]$h.HotFixID; date=$(if ($h.InstalledOn -is [datetime]) { $h.InstalledOn.ToUniversalTime().ToString('o') } else { [string]$h.InstalledOn })} | ConvertTo-Json -Compress } else { '{}' } } catch { '{}' }`, 9*time.Second)
		if err == nil {
			hotfixErr = decodeJSONObject(out, &hotfix)
		} else {
			hotfixErr = err
		}
	}()
	wg.Wait()

	// Pending reboot: three independent Windows mechanisms.
	reboot, rebootWhy := pendingReboot()
	rebootStatus := "ok"
	if reboot {
		rebootStatus = "bad"
	}
	report.Items = append(report.Items, HealthItem{ID: "pendingReboot", Status: rebootStatus, Detail: strings.Join(rebootWhy, ", ")})

	// Defender.
	switch {
	case defendErr != nil || (defender.Signature == "" && !defender.Antivirus):
		detail := ""
		if defendErr != nil {
			detail = defendErr.Error()
		}
		report.Items = append(report.Items, HealthItem{ID: "defender", Status: "unknown", Detail: detail})
	case !defender.Antivirus || !defender.Realtime:
		report.Items = append(report.Items, HealthItem{ID: "defender", Status: "bad", Value: defender.Signature, Detail: "disabled"})
	case defender.Age > 30:
		report.Items = append(report.Items, HealthItem{ID: "defender", Status: "bad", Value: defender.Signature, Detail: strconv.Itoa(defender.Age)})
	case defender.Age > 7:
		report.Items = append(report.Items, HealthItem{ID: "defender", Status: "warn", Value: defender.Signature, Detail: strconv.Itoa(defender.Age)})
	default:
		report.Items = append(report.Items, HealthItem{ID: "defender", Status: "ok", Value: defender.Signature, Detail: strconv.Itoa(defender.Age)})
	}

	// Firewall.
	fwOn, fwTotal := firewallState()
	fwStatus := "ok"
	if fwTotal == 0 {
		fwStatus = "unknown"
	} else if fwOn == 0 {
		fwStatus = "bad"
	} else if fwOn < fwTotal {
		fwStatus = "warn"
	}
	report.Items = append(report.Items, HealthItem{ID: "firewall", Status: fwStatus, Value: fmt.Sprintf("%d/%d", fwOn, fwTotal)})

	// Secure Boot.
	sb := secureBootState()
	sbStatus := "unknown"
	switch sb {
	case "on":
		sbStatus = "ok"
	case "off":
		sbStatus = "warn"
	}
	report.Items = append(report.Items, HealthItem{ID: "secureBoot", Status: sbStatus, Value: sb})

	// BitLocker.
	if bitErr != nil {
		bitlocker = psBitLocker{}
	}
	report.Items = append(report.Items, bitlockerHealthItem(bitlocker))

	// Activation.
	actStatus := "unknown"
	actValue := "unknown"
	if actErr == nil && activation.Status != 0 {
		if activation.Status == 1 {
			actStatus = "ok"
			actValue = "licensed"
		} else {
			actStatus = "warn"
			actValue = "unlicensed"
		}
	}
	report.Items = append(report.Items, HealthItem{ID: "activation", Status: actStatus, Value: actValue, Detail: activation.Name})

	// Latest update.
	hotfixStatus := "unknown"
	if hotfixErr == nil && hotfix.ID != "" {
		hotfixStatus = "ok"
		if t, ok := parseHealthDate(hotfix.Date); ok && time.Since(t) > 60*24*time.Hour {
			hotfixStatus = "warn"
		}
	}
	report.Items = append(report.Items, HealthItem{ID: "windowsUpdate", Status: hotfixStatus, Value: hotfix.ID, Detail: hotfix.Date})

	// Restore point.
	restoreStatus := "warn"
	restoreValue := ""
	if restoreErr == nil && restore.Time != "" {
		restoreValue = restore.Time
		if t, ok := parseHealthDate(restore.Time); ok && time.Since(t) < 30*24*time.Hour {
			restoreStatus = "ok"
		}
	}
	report.Items = append(report.Items, HealthItem{ID: "restorePoint", Status: restoreStatus, Value: restoreValue, Detail: restore.Desc})

	// Battery / power.
	battStatus := "na"
	battValue := ""
	battDetail := ""
	if battErr != nil {
		battStatus = "unknown"
		battDetail = battErr.Error()
	} else if battery.Present {
		battStatus = "ok"
		battDetail = strconv.Itoa(battery.Charge)
		if battery.Full != nil && battery.Design != nil && *battery.Design > 0 {
			health := int(float64(*battery.Full) / float64(*battery.Design) * 100)
			battValue = strconv.Itoa(health)
			switch {
			case health < 50:
				battStatus = "bad"
			case health < 70:
				battStatus = "warn"
			}
		}
	}
	report.Items = append(report.Items, HealthItem{ID: "battery", Status: battStatus, Value: battValue, Detail: battDetail})

	// Uptime.
	uptime := systemUptime()
	report.Items = append(report.Items, HealthItem{ID: "uptime", Status: "info", Value: formatUptime(uptime)})

	// RAM pressure.
	if totalPhys, availPhys := memoryStatus(); totalPhys > 0 {
		freeGB := float64(availPhys) / (1 << 30)
		totalGB := float64(totalPhys) / (1 << 30)
		status := "ok"
		if freeGB < 1 || float64(availPhys)/float64(totalPhys) < 0.10 {
			status = "warn"
		}
		report.Items = append(report.Items, HealthItem{ID: "memory", Status: status, Value: fmt.Sprintf("%.1f / %.1f GB", freeGB, totalGB)})
	}

	// System disk free space.
	if letter := os.Getenv("SystemDrive"); letter != "" {
		if total, free := diskSpace(letter + `\`); total > 0 {
			freeGB := float64(free) / (1 << 30)
			totalGB := float64(total) / (1 << 30)
			status := "ok"
			if freeGB < 5 {
				status = "bad"
			} else if freeGB < 20 {
				status = "warn"
			}
			report.Items = append(report.Items, HealthItem{ID: "disk", Status: status, Value: fmt.Sprintf("%.1f / %.1f GB", freeGB, totalGB)})
		}
	}

	if disksErr != nil {
		report.Error = disksErr.Error()
	}
	for _, d := range disks {
		if strings.TrimSpace(d.Name) == "" {
			continue
		}
		report.Disks = append(report.Disks, diskHealth(d))
	}
	report.DurationMs = int(time.Since(started).Milliseconds())
	return report
}

func parseHealthDate(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.9999999",
		"2006-01-02T15:04:05",
		"2006-01-02",
		"1/2/2006 3:04:05 PM",
		"1/2/2006",
	}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func pendingReboot() (bool, []string) {
	var reasons []string
	cbs := `SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending`
	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, cbs, registry.QUERY_VALUE); err == nil {
		key.Close()
		reasons = append(reasons, "cbs")
	}
	wu := `SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`
	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, wu, registry.QUERY_VALUE); err == nil {
		key.Close()
		reasons = append(reasons, "windowsUpdate")
	}
	session := `SYSTEM\CurrentControlSet\Control\Session Manager`
	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, session, registry.QUERY_VALUE); err == nil {
		if values, _, err := key.GetStringsValue("PendingFileRenameOperations"); err == nil && len(values) > 0 {
			reasons = append(reasons, "fileRename")
		}
		key.Close()
	}
	return len(reasons) > 0, reasons
}

func firewallState() (enabled, total int) {
	paths := []string{
		`SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile`,
		`SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile`,
		`SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile`,
	}
	for _, path := range paths {
		key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		total++
		if value, _, err := key.GetIntegerValue("EnableFirewall"); err == nil && value == 1 {
			enabled++
		}
		key.Close()
	}
	return enabled, total
}

func systemUptime() time.Duration {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel32.NewProc("GetTickCount64")
	ret, _, _ := proc.Call()
	return time.Duration(ret) * time.Millisecond
}

func formatUptime(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	if days > 0 {
		return strconv.Itoa(days) + "d " + strconv.Itoa(hours) + "h"
	}
	return strconv.Itoa(hours) + "h " + strconv.Itoa(int(d.Minutes())%60) + "m"
}
