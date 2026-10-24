package main

import (
	"encoding/xml"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// BatteryHealth is a read-only summary of the installed battery. Capacity is
// reported in mWh because that is what both powercfg and WMI expose.
type BatteryHealth struct {
	Present      bool   `json:"present"`
	Charge       int    `json:"charge,omitempty"`
	Status       string `json:"status,omitempty"`
	DesignMah    int    `json:"designMah,omitempty"`
	FullMah      int    `json:"fullMah,omitempty"`
	HealthPct    int    `json:"healthPct,omitempty"`
	Cycles       int    `json:"cycles,omitempty"`
	Chemistry    string `json:"chemistry,omitempty"`
	RuntimeMin   int    `json:"runtimeMin,omitempty"`
	Manufacturer string `json:"manufacturer,omitempty"`
	Serial       string `json:"serial,omitempty"`
	Message      string `json:"message,omitempty"`
}

const batteryCacheTTL = time.Minute

var (
	batteryMu    sync.Mutex
	batteryCache BatteryHealth
	batteryAt    time.Time
)

func (a *App) GetBatteryHealth(force bool) BatteryHealth {
	batteryMu.Lock()
	defer batteryMu.Unlock()
	if !force && !batteryAt.IsZero() && time.Since(batteryAt) < batteryCacheTTL {
		return batteryCache
	}
	report := collectBatteryHealth()
	batteryCache = report
	batteryAt = time.Now()
	return report
}

type batteryXML struct {
	Batteries struct {
		Battery []struct {
			ID           string `xml:"Id"`
			Manufacturer string `xml:"ManufactureName"`
			Serial       string `xml:"SerialNumber"`
			Chemistry    string `xml:"Chemistry"`
			Design       int    `xml:"DesignCapacity"`
			Full         int    `xml:"FullChargeCapacity"`
			Cycles       int    `xml:"CycleCount"`
		} `xml:"Battery"`
	} `xml:"Batteries"`
}

type psBatteryState struct {
	Present   bool `json:"present"`
	Charge    int  `json:"charge"`
	Status    int  `json:"status"`
	Runtime   int  `json:"runtime"`
	Full      int  `json:"full"`
	Design    int  `json:"design"`
	FullSet   bool `json:"fullSet"`
	DesignSet bool `json:"designSet"`
}

func collectBatteryHealth() BatteryHealth {
	var report BatteryHealth
	var state psBatteryState
	var source batteryXML

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		state = readBatteryState()
	}()
	go func() {
		defer wg.Done()
		source = readBatteryReport()
	}()
	wg.Wait()

	if !state.Present && len(source.Batteries.Battery) == 0 {
		return report
	}
	report.Present = true
	report.Charge = state.Charge
	report.Status = batteryStatusText(state.Status)

	if len(source.Batteries.Battery) > 0 {
		battery := source.Batteries.Battery[0]
		report.DesignMah = battery.Design
		report.FullMah = battery.Full
		report.Cycles = battery.Cycles
		report.Chemistry = strings.TrimSpace(battery.Chemistry)
		report.Manufacturer = strings.TrimSpace(battery.Manufacturer)
		report.Serial = strings.TrimSpace(battery.Serial)
	}
	if report.DesignMah == 0 && state.DesignSet {
		report.DesignMah = state.Design
	}
	if report.FullMah == 0 && state.FullSet {
		report.FullMah = state.Full
	}
	if report.DesignMah > 0 && report.FullMah > 0 {
		health := report.FullMah * 100 / report.DesignMah
		if health > 100 {
			health = 100
		}
		report.HealthPct = health
	}
	if state.Status == 1 && state.Runtime > 0 && state.Runtime < 60*24 {
		report.RuntimeMin = state.Runtime
	}
	if report.DesignMah == 0 && report.FullMah == 0 {
		report.Message = "capacity unavailable"
	}
	return report
}

func readBatteryState() psBatteryState {
	var state psBatteryState
	out, err := runPowerShell(`try {
  $b = Get-CimInstance Win32_Battery -ErrorAction Stop | Select-Object -First 1
  if ($b) {
    $full = $null; $design = $null
    try { $full = (Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity -ErrorAction Stop | Select-Object -First 1).FullChargedCapacity } catch {}
    try { $design = (Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData -ErrorAction Stop | Select-Object -First 1).DesignedCapacity } catch {}
    [pscustomobject]@{present=$true; charge=[int]$b.EstimatedChargeRemaining; status=[int]$b.BatteryStatus; runtime=[int]$b.EstimatedRunTime; full=[int]$full; design=[int]$design; fullSet=($null -ne $full); designSet=($null -ne $design)} | ConvertTo-Json -Compress
  } else { '{"present":false}' }
} catch { '{"present":false}' }`, 10*time.Second)
	if err != nil {
		return state
	}
	_ = decodeJSONObject(out, &state)
	return state
}

func batteryStatusText(status int) string {
	switch status {
	case 1:
		return "discharging"
	case 2:
		return "ac"
	case 3:
		return "full"
	case 6, 7, 8, 9:
		return "charging"
	case 11:
		return "partial"
	default:
		return "unknown"
	}
}

// readBatteryReport asks powercfg for the XML battery report, which is the only
// local source that exposes the design capacity and cycle count.
func readBatteryReport() batteryXML {
	var report batteryXML
	dir, err := dataDir()
	if err != nil {
		return report
	}
	path := filepath.Join(dir, "battery-report.xml")
	_ = os.Remove(path)

	cmd := exec.Command("powercfg.exe", "/batteryreport", "/output", path, "/xml")
	cmd.SysProcAttr = hiddenProcess()
	if err := cmd.Run(); err != nil {
		return report
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return report
	}
	_ = os.Remove(path)
	if err := xml.Unmarshal(data, &report); err != nil {
		return report
	}
	return report
}

func parseBatteryReport(data []byte) (BatteryHealth, error) {
	var report batteryXML
	if err := xml.Unmarshal(data, &report); err != nil {
		return BatteryHealth{}, err
	}
	if len(report.Batteries.Battery) == 0 {
		return BatteryHealth{}, errors.New("no battery in report")
	}
	battery := report.Batteries.Battery[0]
	result := BatteryHealth{
		Present:      true,
		DesignMah:    battery.Design,
		FullMah:      battery.Full,
		Cycles:       battery.Cycles,
		Chemistry:    strings.TrimSpace(battery.Chemistry),
		Manufacturer: strings.TrimSpace(battery.Manufacturer),
		Serial:       strings.TrimSpace(battery.Serial),
	}
	if result.DesignMah > 0 && result.FullMah > 0 {
		result.HealthPct = clampInt(result.FullMah*100/result.DesignMah, 0, 100)
	}
	return result, nil
}

func clampInt(value, low, high int) int {
	if value < low {
		return low
	}
	if value > high {
		return high
	}
	return value
}
