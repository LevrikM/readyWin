package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	appUpdateTTL        = 6 * time.Hour
	appUpdateErrorTTL   = 15 * time.Minute
	appUpdateBodyLimit  = 1 << 20
	appUpdateNotesLimit = 4000
	appUpdateHashLimit  = 4096
)

var appReleaseURL = "https://api.github.com/repos/LevrikM/readyWin/releases/latest"

var appUpdateHTTPClient = &http.Client{Timeout: 8 * time.Second}

var appDownloadClient = &http.Client{
	Timeout: 15 * time.Minute,
	CheckRedirect: func(request *http.Request, via []*http.Request) error {
		if err := validateUpdateURL(request.URL.String()); err != nil {
			return err
		}
		if len(via) >= 10 {
			return errors.New("забагато перенаправлень")
		}
		return nil
	},
}

type AppUpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion,omitempty"`
	Available      bool   `json:"available"`
	ReleaseName    string `json:"releaseName,omitempty"`
	ReleaseURL     string `json:"releaseUrl,omitempty"`
	DownloadURL    string `json:"downloadUrl,omitempty"`
	DownloadSize   int64  `json:"downloadSize,omitempty"`
	Checksum       string `json:"checksum,omitempty"`
	Notes          string `json:"notes,omitempty"`
	PublishedAt    string `json:"publishedAt,omitempty"`
	CheckedAt      string `json:"checkedAt"`
	Error          string `json:"error,omitempty"`
}

type AppUpdateDownload struct {
	Path   string `json:"path"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

type AppUpdateProgress struct {
	Downloaded int64  `json:"downloaded"`
	Total      int64  `json:"total"`
	Percent    int    `json:"percent"`
	Done       bool   `json:"done"`
	Error      string `json:"error,omitempty"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
	Digest             string `json:"digest"`
}

type githubRelease struct {
	TagName     string        `json:"tag_name"`
	Name        string        `json:"name"`
	Body        string        `json:"body"`
	HTMLURL     string        `json:"html_url"`
	PublishedAt string        `json:"published_at"`
	Assets      []githubAsset `json:"assets"`
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
	asset := releaseDownloadAsset(release)
	info.DownloadURL = asset.BrowserDownloadURL
	info.DownloadSize = asset.Size
	info.Checksum = releaseChecksum(release, asset)
	info.Available = compareAppVersions(latestVersion, currentVersion) > 0
	return info
}

func releaseDownloadAsset(release githubRelease) githubAsset {
	for _, asset := range release.Assets {
		if strings.EqualFold(asset.Name, "ReadyWin.exe") {
			return asset
		}
	}
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.HasPrefix(name, "readywin-") && strings.HasSuffix(name, ".zip") {
			return asset
		}
	}
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, ".exe") || strings.HasSuffix(name, ".zip") {
			return asset
		}
	}
	return githubAsset{}
}

func releaseDownloadURL(release githubRelease) string {
	return releaseDownloadAsset(release).BrowserDownloadURL
}

func releaseChecksum(release githubRelease, download githubAsset) string {
	if sum := normalizeSHA256(strings.TrimPrefix(download.Digest, "sha256:")); sum != "" {
		return sum
	}
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if name != "readywin.exe.sha256" && name != "sha256sums.txt" && name != "checksums.txt" {
			continue
		}
		if sum := fetchChecksum(asset.BrowserDownloadURL); sum != "" {
			return sum
		}
	}
	return ""
}

func fetchChecksum(rawURL string) string {
	if err := validateUpdateURL(rawURL); err != nil {
		return ""
	}
	request, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return ""
	}
	request.Header.Set("User-Agent", "ReadyWin/"+appVersion)
	response, err := appUpdateHTTPClient.Do(request)
	if err != nil {
		return ""
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return ""
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, appUpdateHashLimit))
	if err != nil {
		return ""
	}
	for _, field := range strings.Fields(string(body)) {
		if sum := normalizeSHA256(strings.TrimPrefix(field, "sha256:")); sum != "" {
			return sum
		}
	}
	return ""
}

func normalizeSHA256(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) != sha256.Size*2 {
		return ""
	}
	if _, err := hex.DecodeString(value); err != nil {
		return ""
	}
	return value
}

func validateUpdateURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return errors.New("некоректне посилання на оновлення")
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "github.com" || strings.HasSuffix(host, ".githubusercontent.com") {
		return nil
	}
	return errors.New("недозволене джерело оновлення")
}

func (a *App) DownloadAppUpdate() (AppUpdateDownload, error) {
	var result AppUpdateDownload
	info := a.GetAppUpdate(false)
	if !info.Available || info.DownloadURL == "" {
		return result, errors.New("оновлення недоступне")
	}
	if info.Checksum == "" {
		return result, errors.New("у релізі немає SHA256")
	}
	if err := validateUpdateURL(info.DownloadURL); err != nil {
		return result, err
	}

	baseDir, err := dataDir()
	if err != nil {
		return result, err
	}
	updatesDir := filepath.Join(baseDir, "updates")
	if err := os.MkdirAll(updatesDir, 0o755); err != nil {
		return result, err
	}
	name := safeUpdateName(info.DownloadURL, info.LatestVersion)
	target := filepath.Join(updatesDir, name)
	partial := target + ".part"
	_ = os.Remove(partial)

	request, err := http.NewRequest(http.MethodGet, info.DownloadURL, nil)
	if err != nil {
		return result, err
	}
	request.Header.Set("User-Agent", "ReadyWin/"+appVersion)
	response, err := appDownloadClient.Do(request)
	if err != nil {
		return result, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return result, fmt.Errorf("завантаження: %s", response.Status)
	}

	file, err := os.Create(partial)
	if err != nil {
		return result, err
	}
	hasher := sha256.New()
	progress := &updateProgressWriter{
		total: response.ContentLength,
		emit: func(downloaded int64) {
			emitAppUpdateProgress(a.ctx, downloaded, response.ContentLength, false, "")
		},
	}
	written, copyErr := io.Copy(io.MultiWriter(file, hasher, progress), response.Body)
	closeErr := file.Close()
	if copyErr != nil {
		_ = os.Remove(partial)
		emitAppUpdateProgress(a.ctx, written, response.ContentLength, true, copyErr.Error())
		return result, copyErr
	}
	if closeErr != nil {
		_ = os.Remove(partial)
		emitAppUpdateProgress(a.ctx, written, response.ContentLength, true, closeErr.Error())
		return result, closeErr
	}

	sum := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(sum, info.Checksum) {
		_ = os.Remove(partial)
		err := errors.New("SHA256 не збігається")
		emitAppUpdateProgress(a.ctx, written, response.ContentLength, true, err.Error())
		return result, err
	}
	if err := os.Remove(target); err != nil && !errors.Is(err, os.ErrNotExist) {
		_ = os.Remove(partial)
		emitAppUpdateProgress(a.ctx, written, response.ContentLength, true, err.Error())
		return result, err
	}
	if err := os.Rename(partial, target); err != nil {
		_ = os.Remove(partial)
		emitAppUpdateProgress(a.ctx, written, response.ContentLength, true, err.Error())
		return result, err
	}
	emitAppUpdateProgress(a.ctx, written, response.ContentLength, true, "")
	return AppUpdateDownload{Path: target, SHA256: sum, Size: written}, nil
}

func (a *App) OpenUpdatesFolder() error {
	baseDir, err := dataDir()
	if err != nil {
		return err
	}
	path := filepath.Join(baseDir, "updates")
	if err := os.MkdirAll(path, 0o755); err != nil {
		return err
	}
	return exec.Command("explorer.exe", path).Start()
}

func safeUpdateName(rawURL, version string) string {
	name := ""
	if parsed, err := url.Parse(rawURL); err == nil && !strings.HasSuffix(parsed.Path, "/") {
		name = filepath.Base(parsed.Path)
	}
	if name == "" || name == "." || name == ".." || name == string(os.PathSeparator) {
		name = "ReadyWin-" + version + ".exe"
	}
	name = strings.Map(func(r rune) rune {
		if strings.ContainsRune(`<>:"/\|?*`, r) {
			return '-'
		}
		return r
	}, name)
	return name
}

type updateProgressWriter struct {
	total    int64
	written  int64
	lastEmit time.Time
	emit     func(int64)
}

func (w *updateProgressWriter) Write(data []byte) (int, error) {
	w.written += int64(len(data))
	now := time.Now()
	if now.Sub(w.lastEmit) >= 150*time.Millisecond || (w.total > 0 && w.written >= w.total) {
		w.lastEmit = now
		w.emit(w.written)
	}
	return len(data), nil
}

func emitAppUpdateProgress(ctx context.Context, downloaded, total int64, done bool, errText string) {
	if ctx == nil {
		return
	}
	percent := 0
	if total > 0 {
		percent = int(downloaded * 100 / total)
		if percent > 100 {
			percent = 100
		}
	}
	wruntime.EventsEmit(ctx, "appupdate:progress", AppUpdateProgress{
		Downloaded: downloaded,
		Total:      total,
		Percent:    percent,
		Done:       done,
		Error:      errText,
	})
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
