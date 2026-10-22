package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const profileFormat = "readywin.profile/1"

type ProfileApp struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type ProfileFile struct {
	Format     string            `json:"format"`
	Version    string            `json:"version"`
	ExportedAt string            `json:"exportedAt"`
	Apps       []ProfileApp      `json:"apps"`
	Settings   map[string]string `json:"settings,omitempty"`
}

type TransferResult struct {
	Cancelled bool   `json:"cancelled"`
	Path      string `json:"path,omitempty"`
	Count     int    `json:"count"`
}

type ImportResult struct {
	Cancelled bool              `json:"cancelled"`
	Path      string            `json:"path,omitempty"`
	Apps      []string          `json:"apps"`
	Unknown   []string          `json:"unknown"`
	Settings  map[string]string `json:"settings,omitempty"`
}

type wingetExportFile struct {
	Sources []struct {
		Packages []struct {
			PackageIdentifier string `json:"PackageIdentifier"`
		} `json:"Packages"`
	} `json:"Sources"`
	Packages []struct {
		PackageIdentifier string `json:"PackageIdentifier"`
	} `json:"Packages"`
}

// ExportProfile writes the selected catalog IDs and UI settings to a portable
// JSON file. It is intentionally human-readable and contains no machine data.
func (a *App) ExportProfile(ids []string, settings map[string]string) (TransferResult, error) {
	if a.ctx == nil {
		return TransferResult{}, errors.New("файловий діалог доступний лише в десктопній версії")
	}
	cat, err := loadCatalog()
	if err != nil {
		return TransferResult{}, err
	}
	byID := make(map[string]Item, len(cat.Items))
	for _, item := range cat.Items {
		byID[item.ID] = item
	}
	seen := make(map[string]bool, len(ids))
	apps := make([]ProfileApp, 0, len(ids))
	for _, id := range ids {
		if seen[id] {
			continue
		}
		item, ok := byID[id]
		if !ok {
			continue
		}
		seen[id] = true
		apps = append(apps, ProfileApp{ID: item.ID, Name: item.ShortName})
	}
	if len(apps) == 0 {
		return TransferResult{}, errors.New("немає програм для експорту")
	}
	safeSettings := map[string]string{}
	for _, key := range []string{"theme", "lang"} {
		if value := strings.TrimSpace(settings[key]); value != "" {
			safeSettings[key] = value
		}
	}
	profile := ProfileFile{
		Format:     profileFormat,
		Version:    a.GetVersion(),
		ExportedAt: time.Now().Format(time.RFC3339),
		Apps:       apps,
		Settings:   safeSettings,
	}
	data, err := json.MarshalIndent(profile, "", "  ")
	if err != nil {
		return TransferResult{}, err
	}
	data = append(data, '\n')

	path, err := wruntime.SaveFileDialog(a.ctx, wruntime.SaveDialogOptions{
		Title:           "Експорт конфігурації ReadyWin",
		DefaultFilename: "readywin-profile-" + time.Now().Format("20060102") + ".json",
		Filters: []wruntime.FileFilter{
			{DisplayName: "ReadyWin profile (*.json)", Pattern: "*.json"},
		},
		CanCreateDirectories: true,
	})
	if err != nil {
		return TransferResult{}, err
	}
	if strings.TrimSpace(path) == "" {
		return TransferResult{Cancelled: true}, nil
	}
	if err := writeFileAtomic(path, data, 0o644); err != nil {
		return TransferResult{}, err
	}
	return TransferResult{Path: path, Count: len(apps)}, nil
}

func (a *App) ImportProfile() (ImportResult, error) {
	if a.ctx == nil {
		return ImportResult{}, errors.New("файловий діалог доступний лише в десктопній версії")
	}
	path, err := wruntime.OpenFileDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Імпорт конфігурації ReadyWin",
		Filters: []wruntime.FileFilter{
			{DisplayName: "ReadyWin profile або winget export (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return ImportResult{}, err
	}
	if strings.TrimSpace(path) == "" {
		return ImportResult{Cancelled: true}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ImportResult{}, err
	}
	if len(data) > 4<<20 {
		return ImportResult{}, errors.New("файл конфігурації завеликий")
	}
	return parseProfileFile(path, data)
}

func parseProfileFile(path string, data []byte) (ImportResult, error) {
	cat, err := loadCatalog()
	if err != nil {
		return ImportResult{}, err
	}
	byID := make(map[string]bool, len(cat.Items))
	for _, item := range cat.Items {
		byID[item.ID] = true
	}

	var profile ProfileFile
	if err := json.Unmarshal(data, &profile); err == nil && profile.Format == profileFormat {
		result := ImportResult{Path: path, Apps: []string{}, Unknown: []string{}, Settings: map[string]string{}}
		seen := make(map[string]bool)
		for _, app := range profile.Apps {
			id := strings.TrimSpace(app.ID)
			if id == "" || seen[id] {
				continue
			}
			seen[id] = true
			if byID[id] {
				result.Apps = append(result.Apps, id)
			} else {
				result.Unknown = append(result.Unknown, id)
			}
		}
		for _, key := range []string{"theme", "lang"} {
			if value := strings.TrimSpace(profile.Settings[key]); value != "" {
				result.Settings[key] = value
			}
		}
		if len(result.Apps) == 0 && len(result.Unknown) == 0 {
			return ImportResult{}, errors.New("у файлі немає програм")
		}
		return result, nil
	}

	var exported wingetExportFile
	if err := json.Unmarshal(data, &exported); err != nil {
		return ImportResult{}, errors.New("невідомий формат файлу конфігурації")
	}
	var ids []string
	for _, source := range exported.Sources {
		for _, pkg := range source.Packages {
			ids = append(ids, pkg.PackageIdentifier)
		}
	}
	for _, pkg := range exported.Packages {
		ids = append(ids, pkg.PackageIdentifier)
	}
	if len(ids) == 0 {
		return ImportResult{}, errors.New("у файлі не знайдено пакетів winget")
	}
	result := ImportResult{Path: path, Apps: []string{}, Unknown: []string{}}
	seen := make(map[string]bool)
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		if byID[id] {
			result.Apps = append(result.Apps, id)
		} else {
			result.Unknown = append(result.Unknown, id)
		}
	}
	return result, nil
}

// ExportWinget asks winget for a native export file. This is useful for
// migration tools outside ReadyWin and does not depend on the catalog.
func (a *App) ExportWinget() (TransferResult, error) {
	if a.ctx == nil {
		return TransferResult{}, errors.New("файловий діалог доступний лише в десктопній версії")
	}
	path, err := wruntime.SaveFileDialog(a.ctx, wruntime.SaveDialogOptions{
		Title:           "winget export",
		DefaultFilename: "winget-export-" + time.Now().Format("20060102") + ".json",
		Filters: []wruntime.FileFilter{
			{DisplayName: "winget export (*.json)", Pattern: "*.json"},
		},
		CanCreateDirectories: true,
	})
	if err != nil {
		return TransferResult{}, err
	}
	if strings.TrimSpace(path) == "" {
		return TransferResult{Cancelled: true}, nil
	}
	if _, err := runWingetTimeout(3*time.Minute, "export", "--output", path, "--include-versions", "--accept-source-agreements"); err != nil {
		return TransferResult{}, fmt.Errorf("winget export: %w", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return TransferResult{}, err
	}
	var exported wingetExportFile
	_ = json.Unmarshal(data, &exported)
	count := 0
	for _, source := range exported.Sources {
		count += len(source.Packages)
	}
	return TransferResult{Path: path, Count: count}, nil
}

// ImportWingetFile reads a winget export (or a ReadyWin profile) and returns
// matching catalog IDs so they can be reviewed in the queue before install.
func (a *App) ImportWingetFile() (ImportResult, error) {
	if a.ctx == nil {
		return ImportResult{}, errors.New("файловий діалог доступний лише в десктопній версії")
	}
	path, err := wruntime.OpenFileDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Імпорт winget export",
		Filters: []wruntime.FileFilter{
			{DisplayName: "JSON (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return ImportResult{}, err
	}
	if strings.TrimSpace(path) == "" {
		return ImportResult{Cancelled: true}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ImportResult{}, err
	}
	if len(data) > 4<<20 {
		return ImportResult{}, errors.New("файл завеликий")
	}
	return parseProfileFile(filepath.Clean(path), data)
}
