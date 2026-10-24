package main

import (
	"strings"
	"sync"
	"time"
)

// EventLogGroup is one error signature from the last seven days. Messages are
// shortened to the first meaningful line so the UI stays readable.
type EventLogGroup struct {
	Source  string `json:"source"`
	ID      int    `json:"id"`
	Level   int    `json:"level"`
	Count   int    `json:"count"`
	Last    string `json:"last"`
	Message string `json:"message"`
}

type EventLogReport struct {
	CheckedAt string          `json:"checkedAt"`
	Days      int             `json:"days"`
	Total     int             `json:"total"`
	Groups    []EventLogGroup `json:"groups"`
	Error     string          `json:"error,omitempty"`
}

const (
	eventLogDays     = 7
	eventLogCacheTTL = 2 * time.Minute
	eventLogMessage  = 240
)

var (
	eventLogMu    sync.Mutex
	eventLogCache EventLogReport
	eventLogAt    time.Time
)

// GetEventLog reads System and Application errors from the last week. It never
// changes anything: there is deliberately no "fix all" action behind it.
func (a *App) GetEventLog(force bool) EventLogReport {
	eventLogMu.Lock()
	defer eventLogMu.Unlock()
	if !force && !eventLogAt.IsZero() && time.Since(eventLogAt) < eventLogCacheTTL {
		return eventLogCache
	}
	report := collectEventLog()
	eventLogCache = report
	eventLogAt = time.Now()
	return report
}

func collectEventLog() EventLogReport {
	report := EventLogReport{
		CheckedAt: time.Now().Format(time.RFC3339),
		Days:      eventLogDays,
		Groups:    []EventLogGroup{},
	}
	out, err := runPowerShell(`try {
  $start = (Get-Date).AddDays(-7)
  $events = @(Get-WinEvent -FilterHashtable @{LogName=@('System','Application'); Level=@(1,2); StartTime=$start} -MaxEvents 500 -ErrorAction SilentlyContinue)
} catch { $events = @() }
$groups = @()
foreach ($g in ($events | Group-Object ProviderName, Id | Sort-Object Count -Descending | Select-Object -First 12)) {
  $first = $g.Group | Select-Object -First 1
  $message = ''
  if ($first.Message) {
    $message = (($first.Message -split "\r?\n") | Where-Object { $_.Trim() } | Select-Object -First 1)
  }
  $last = ''
  try { $last = $first.TimeCreated.ToUniversalTime().ToString('o') } catch {}
  $groups += [pscustomobject]@{
    source = [string]$first.ProviderName
    id = [int]$first.Id
    level = [int]$first.Level
    count = [int]$g.Count
    last = $last
    message = [string]$message
  }
}
[pscustomobject]@{total=$events.Count; groups=$groups} | ConvertTo-Json -Compress -Depth 5`, 25*time.Second)
	if err != nil {
		report.Error = err.Error()
		return report
	}
	var parsed struct {
		Total  int             `json:"total"`
		Groups []EventLogGroup `json:"groups"`
	}
	if err := decodeJSONObject(out, &parsed); err != nil {
		report.Error = err.Error()
		return report
	}
	report.Total = parsed.Total
	for _, group := range parsed.Groups {
		group.Source = truncateText(group.Source, 80)
		group.Message = truncateText(strings.Join(strings.Fields(group.Message), " "), eventLogMessage)
		report.Groups = append(report.Groups, group)
	}
	return report
}
