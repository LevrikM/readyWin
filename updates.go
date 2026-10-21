package main

import (
	"errors"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type UpdateInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Installed string `json:"installed,omitempty"`
	Available string `json:"available,omitempty"`
	Source    string `json:"source,omitempty"`
}

type UpdateReport struct {
	CheckedAt      string       `json:"checkedAt"`
	DurationMs     int          `json:"durationMs"`
	Updates        []UpdateInfo `json:"updates"`
	InstalledCount int          `json:"installedCount"`
	UpToDate       int          `json:"upToDate"`
	Error          string       `json:"error,omitempty"`
}

const updatesCacheTTL = 90 * time.Second

var (
	updatesMu      sync.Mutex
	updatesCache   *UpdateReport
	updatesCacheAt time.Time
)

func invalidateUpdates() {
	updatesMu.Lock()
	updatesCache = nil
	updatesMu.Unlock()
}

func (a *App) GetUpdates(force bool) (UpdateReport, error) {
	updatesMu.Lock()
	if !force && updatesCache != nil && time.Since(updatesCacheAt) < updatesCacheTTL {
		cached := *updatesCache
		updatesMu.Unlock()
		return cached, nil
	}
	updatesMu.Unlock()

	report := a.checkUpdates()

	updatesMu.Lock()
	updatesCache = &report
	updatesCacheAt = time.Now()
	updatesMu.Unlock()
	return report, nil
}

func (a *App) RefreshUpdates() (UpdateReport, error) {
	return a.GetUpdates(true)
}

func (a *App) checkUpdates() UpdateReport {
	started := time.Now()
	report := UpdateReport{
		CheckedAt: started.Format(time.RFC3339),
		Updates:   []UpdateInfo{},
	}

	cat, err := loadCatalog()
	if err != nil {
		report.Error = err.Error()
		return report
	}

	installed := a.detectInstalled(cat)
	report.InstalledCount = len(installed)

	out, err := runWinget("upgrade", "--include-unknown", "--accept-source-agreements", "--disable-interactivity")
	report.DurationMs = int(time.Since(started).Milliseconds())
	if err != nil {
		report.Error = err.Error()
		return report
	}

	rows := parseWingetTable(out)
	seen := make(map[string]bool, len(rows))
	for _, row := range rows {
		id := row.id
		if _, ok := catalogItem(cat.Items, id); !ok {
			matched, _ := bestCatalogMatch(row.name, cat.Items)
			if matched == "" {
				continue
			}
			id = matched
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		name := row.name
		if item, ok := catalogItem(cat.Items, id); ok {
			name = item.Name
		}
		report.Updates = append(report.Updates, UpdateInfo{
			ID:        id,
			Name:      name,
			Installed: row.version,
			Available: row.available,
			Source:    row.source,
		})
	}
	if report.UpToDate = report.InstalledCount - len(report.Updates); report.UpToDate < 0 {
		report.UpToDate = 0
	}
	return report
}

// runWinget executes winget through cmd.exe with a UTF-8 console so accented
// and Cyrillic product names survive the trip back.
func runWinget(args ...string) (string, error) {
	path, err := exec.LookPath("winget")
	if err != nil {
		return "", errors.New("winget не знайдено в PATH")
	}
	parts := []string{"chcp 65001>nul &&", cmdQuote(path)}
	for _, arg := range args {
		parts = append(parts, cmdQuote(arg))
	}
	cmd := exec.Command("cmd.exe", "/c", strings.Join(parts, " "))
	cmd.SysProcAttr = hiddenProcess()

	out, err := cmd.Output()
	text := string(out)
	if err != nil && text == "" {
		return "", err
	}
	// winget still prints a usable table on a non-zero exit code, so the output wins.
	return text, nil
}

func cmdQuote(value string) string {
	if value == "" {
		return `""`
	}
	if !strings.ContainsAny(value, " \t\"&^|<>()") {
		return value
	}
	return `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
}

type wingetRow struct {
	name      string
	id        string
	version   string
	available string
	source    string
}

func parseWingetTable(out string) []wingetRow {
	lines := strings.Split(out, "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], "\r")
	}

	headerIdx := -1
	idCol, versionCol, availableCol, sourceCol := 0, 0, 0, 0
	for i, line := range lines {
		lower := strings.ToLower(line)
		if !strings.Contains(lower, "name") || !strings.Contains(lower, "id") || !strings.Contains(lower, "version") {
			continue
		}
		idCol = strings.Index(lower, "id")
		versionCol = strings.Index(lower, "version")
		availableCol = strings.Index(lower, "available")
		sourceCol = strings.Index(lower, "source")
		if idCol >= 0 && versionCol > idCol {
			headerIdx = i
			break
		}
	}
	if headerIdx < 0 {
		return nil
	}
	if availableCol < 0 {
		availableCol = len(lines[headerIdx])
	}
	if sourceCol < 0 {
		sourceCol = availableCol
	}

	rows := make([]wingetRow, 0, 8)
	for _, line := range lines[headerIdx+1:] {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "-") {
			continue
		}
		// winget pads by characters; read as runes so Cyrillic names don't shift columns.
		runes := []rune(line)
		if len(runes) <= idCol {
			continue
		}
		cut := func(from, to int) string {
			if from < 0 || from >= len(runes) {
				return ""
			}
			if to > len(runes) || to < from {
				to = len(runes)
			}
			return strings.TrimSpace(string(runes[from:to]))
		}
		id := cut(idCol, versionCol)
		if id == "" || strings.ContainsAny(id, " \t") {
			continue
		}
		available := cut(availableCol, sourceCol)
		if available == "" {
			continue
		}
		rows = append(rows, wingetRow{
			name:      strings.TrimSpace(string(runes[:idCol])),
			id:        id,
			version:   cut(versionCol, availableCol),
			available: available,
			source:    cut(sourceCol, len(runes)),
		})
	}
	return rows
}
