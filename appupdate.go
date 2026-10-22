package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	appUpdateTTL        = 6 * time.Hour
	appUpdateErrorTTL   = 15 * time.Minute
	appUpdateBodyLimit  = 1 << 20
	appUpdateNotesLimit = 4000
)

var appReleaseURL = "https://api.github.com/repos/LevrikM/readyWin/releases/latest"

var appUpdateHTTPClient = &http.Client{Timeout: 8 * time.Second}

type AppUpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion,omitempty"`
	Available      bool   `json:"available"`
	ReleaseName    string `json:"releaseName,omitempty"`
	ReleaseURL     string `json:"releaseUrl,omitempty"`
	DownloadURL    string `json:"downloadUrl,omitempty"`
	Notes          string `json:"notes,omitempty"`
	PublishedAt    string `json:"publishedAt,omitempty"`
	CheckedAt      string `json:"checkedAt"`
	Error          string `json:"error,omitempty"`
}

type githubRelease struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

var (
	appUpdateMu      sync.Mutex
	appUpdateCache   *AppUpdateInfo
	appUpdateCacheAt time.Time
)

func (a *App) GetAppUpdate(force bool) AppUpdateInfo {
	appUpdateMu.Lock()
	defer appUpdateMu.Unlock()

	ttl := appUpdateTTL
	if appUpdateCache != nil && appUpdateCache.Error != "" {
		ttl = appUpdateErrorTTL
	}
	if !force && appUpdateCache != nil && time.Since(appUpdateCacheAt) < ttl {
		return *appUpdateCache
	}

	info := fetchAppUpdate(appReleaseURL, appVersion)
	appUpdateCache = &info
	appUpdateCacheAt = time.Now()
	return info
}

func fetchAppUpdate(url, current string) AppUpdateInfo {
	info := AppUpdateInfo{
		CurrentVersion: current,
		CheckedAt:      time.Now().UTC().Format(time.RFC3339),
	}
	currentVersion, ok := parseAppVersion(current)
	if !ok {
		return info
	}

	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		info.Error = err.Error()
		return info
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "ReadyWin/"+current)

	response, err := appUpdateHTTPClient.Do(request)
	if err != nil {
		info.Error = err.Error()
		return info
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusNotFound {
		return info
	}
	if response.StatusCode != http.StatusOK {
		info.Error = fmt.Sprintf("GitHub: %s", response.Status)
		return info
	}

	var release githubRelease
	if err := json.NewDecoder(io.LimitReader(response.Body, appUpdateBodyLimit)).Decode(&release); err != nil {
		info.Error = err.Error()
		return info
	}
	latestVersion, ok := parseAppVersion(release.TagName)
	if !ok {
		info.Error = "некоректна версія релізу"
		return info
	}

	info.LatestVersion = strings.TrimPrefix(strings.TrimSpace(release.TagName), "v")
	info.ReleaseName = strings.TrimSpace(release.Name)
	info.ReleaseURL = release.HTMLURL
	info.PublishedAt = release.PublishedAt
	info.Notes = truncateText(strings.TrimSpace(release.Body), appUpdateNotesLimit)
	info.DownloadURL = releaseDownloadURL(release)
	info.Available = compareAppVersions(latestVersion, currentVersion) > 0
	return info
}

func releaseDownloadURL(release githubRelease) string {
	for _, asset := range release.Assets {
		if strings.EqualFold(asset.Name, "ReadyWin.exe") {
			return asset.BrowserDownloadURL
		}
	}
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.HasPrefix(name, "readywin-") && strings.HasSuffix(name, ".zip") {
			return asset.BrowserDownloadURL
		}
	}
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, ".exe") || strings.HasSuffix(name, ".zip") {
			return asset.BrowserDownloadURL
		}
	}
	return ""
}

func parseAppVersion(raw string) ([3]int, bool) {
	var version [3]int
	value := strings.TrimSpace(raw)
	if strings.HasPrefix(value, "v") || strings.HasPrefix(value, "V") {
		value = value[1:]
	}
	if cut := strings.IndexAny(value, "-+"); cut >= 0 {
		value = value[:cut]
	}
	if value == "" || value == "." {
		return [3]int{}, false
	}
	parts := strings.Split(value, ".")
	if len(parts) > len(version) {
		return [3]int{}, false
	}
	for index, part := range parts {
		if part == "" {
			return [3]int{}, false
		}
		number, err := strconv.Atoi(part)
		if err != nil || number < 0 {
			return [3]int{}, false
		}
		version[index] = number
	}
	return version, true
}

func compareAppVersions(left, right [3]int) int {
	for index := range left {
		if left[index] > right[index] {
			return 1
		}
		if left[index] < right[index] {
			return -1
		}
	}
	return 0
}

func truncateText(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return strings.TrimSpace(string(runes[:limit])) + "…"
}
