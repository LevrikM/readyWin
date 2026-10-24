package main

import (
	"errors"
	"strings"
	"sync"
	"time"
)

type WingetResult struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version"`
	Match   string `json:"match,omitempty"`
	Source  string `json:"source,omitempty"`
}

type WingetSearchResult struct {
	Query     string         `json:"query"`
	CheckedAt string         `json:"checkedAt"`
	Results   []WingetResult `json:"results"`
	Error     string         `json:"error,omitempty"`
}

const (
	wingetSearchMinQuery = 2
	wingetSearchLimit    = 25
	wingetSearchCacheTTL = time.Minute
	wingetSearchMaxCache = 24
)

var (
	wingetSearchMu    sync.Mutex
	wingetSearchCache = map[string]wingetSearchEntry{}
)

type wingetSearchEntry struct {
	result WingetSearchResult
	at     time.Time
}

// SearchWinget looks up packages in the public winget repository. The curated
// catalog stays the default; this is the escape hatch for everything else.
func (a *App) SearchWinget(query string) WingetSearchResult {
	query = strings.TrimSpace(query)
	report := WingetSearchResult{
		Query:     query,
		CheckedAt: time.Now().Format(time.RFC3339),
		Results:   []WingetResult{},
	}
	if len([]rune(query)) < wingetSearchMinQuery {
		return report
	}

	key := strings.ToLower(query)
	wingetSearchMu.Lock()
	if entry, ok := wingetSearchCache[key]; ok && time.Since(entry.at) < wingetSearchCacheTTL {
		wingetSearchMu.Unlock()
		return entry.result
	}
	wingetSearchMu.Unlock()

	out, err := runWingetTimeout(45*time.Second,
		"search", "--query", query,
		"--source", "winget",
		"--count", "25",
		"--accept-source-agreements",
		"--disable-interactivity",
	)
	if err != nil {
		report.Error = err.Error()
		return report
	}
	report.Results = parseWingetSearch(out)

	wingetSearchMu.Lock()
	if len(wingetSearchCache) >= wingetSearchMaxCache {
		oldestKey := ""
		var oldest time.Time
		for cacheKey, entry := range wingetSearchCache {
			if oldestKey == "" || entry.at.Before(oldest) {
				oldestKey, oldest = cacheKey, entry.at
			}
		}
		if oldestKey != "" {
			delete(wingetSearchCache, oldestKey)
		}
	}
	wingetSearchCache[key] = wingetSearchEntry{result: report, at: time.Now()}
	wingetSearchMu.Unlock()
	return report
}

// InstallWingetPackage installs one package found through SearchWinget. winget
// verifies the installer hash against its signed manifest before running it.
func (a *App) InstallWingetPackage(id, name string) (InstallState, error) {
	id = strings.TrimSpace(id)
	if !wingetIDPattern.MatchString(id) {
		return InstallState{}, errors.New("некоректний ідентифікатор пакета")
	}
	cat, err := loadCatalog()
	if err != nil {
		return InstallState{}, err
	}
	return a.startTargets(wgInstall, []installTarget{{id: id, name: strings.TrimSpace(name)}}, cat)
}

func wingetPackageInstalled(id string) bool {
	out, err := runWingetTimeout(30*time.Second,
		"list", "--id", id, "--exact",
		"--accept-source-agreements",
		"--disable-interactivity",
	)
	if err != nil && strings.TrimSpace(out) == "" {
		return false
	}
	return strings.Contains(strings.ToLower(out), strings.ToLower(id))
}

func parseWingetSearch(out string) []WingetResult {
	lines := strings.Split(out, "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], "\r")
	}

	headerIdx := -1
	nameCol, idCol, versionCol, matchCol, sourceCol := 0, 0, 0, 0, 0
	for i, line := range lines {
		lower := strings.ToLower(line)
		if !strings.Contains(lower, "name") || !strings.Contains(lower, "id") || !strings.Contains(lower, "version") {
			continue
		}
		nameCol = strings.Index(lower, "name")
		idCol = strings.Index(lower, "id")
		versionCol = strings.Index(lower, "version")
		matchCol = strings.Index(lower, "match")
		sourceCol = strings.Index(lower, "source")
		if idCol > nameCol && versionCol > idCol {
			headerIdx = i
			break
		}
	}
	if headerIdx < 0 {
		return nil
	}
	hasMatch := matchCol >= 0 && matchCol >= versionCol
	hasSource := sourceCol >= 0 && sourceCol >= versionCol
	// Zero means "until the end of the row"; the source column, when present,
	// is always last.
	matchEnd := 0
	versionEnd := 0
	if hasSource {
		matchEnd = sourceCol
		versionEnd = sourceCol
	}
	if hasMatch {
		versionEnd = matchCol
	}

	results := make([]WingetResult, 0, 8)
	for _, line := range lines[headerIdx+1:] {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "-") || strings.HasPrefix(trimmed, "<") {
			continue
		}
		runes := []rune(line)
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
		name := cut(nameCol, idCol)
		if name == "" {
			name = id
		}
		match := ""
		if hasMatch {
			match = cut(matchCol, matchEnd)
		}
		source := ""
		if hasSource {
			source = cut(sourceCol, 0)
		}
		results = append(results, WingetResult{
			ID:      id,
			Name:    name,
			Version: cut(versionCol, versionEnd),
			Match:   match,
			Source:  source,
		})
		if len(results) >= wingetSearchLimit {
			break
		}
	}
	return results
}
