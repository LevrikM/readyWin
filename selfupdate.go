package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// ReadyWin is a single portable EXE, so a real update means replacing the file
// that is currently running and starting the new one. Windows keeps a lock on a
// running image, therefore the swap happens in a detached PowerShell helper
// after the app has exited.
const (
	updateResultName   = "update-result.json"
	updateJournalName  = "update-journal.json"
	updateSettingsName = "app-update.json"
	updateReadyName    = "update-ready.txt"
	updateLogName      = "update.log"
	updateLogTailLimit = 1500
	updateExitTimeout  = 120 * time.Second
	updateAutoCheckGap = 6 * time.Hour
	updateAutoStartGap = 5 * time.Second
	updateKeepFiles    = 3
	updateResultTTL    = 14 * 24 * time.Hour
)

// AppUpdateSettings is persisted next to the other ReadyWin data so the choice
// survives restarts and can be read by the next version of the app.
type AppUpdateSettings struct {
	AutoCheck    bool             `json:"autoCheck"`
	AutoDownload bool             `json:"autoDownload"`
	LastCheck    string           `json:"lastCheck,omitempty"`
	LastResult   *AppUpdateResult `json:"lastResult,omitempty"`
}

// AppUpdateResult describes what happened during the last in-place swap.
type AppUpdateResult struct {
	Status   string `json:"status"` // applying | installed | failed
	Version  string `json:"version,omitempty"`
	Previous string `json:"previous,omitempty"`
	Message  string `json:"message,omitempty"`
	At       string `json:"at,omitempty"`
	Elevated bool   `json:"elevated,omitempty"`
}

type updateJournal struct {
	Version    string `json:"version"`
	Previous   string `json:"previous"`
	Target     string `json:"target"`
	Backup     string `json:"backup"`
	Staged     string `json:"staged"`
	Source     string `json:"source"`
	LogPath    string `json:"logPath"`
	ResultPath string `json:"resultPath"`
	StartedAt  string `json:"startedAt"`
	Elevated   bool   `json:"elevated"`
}

type updatePlan struct {
	ProcessID  int
	Source     string
	Target     string
	Backup     string
	Staged     string
	LogPath    string
	ResultPath string
	ReadyPath  string
	Version    string
	Previous   string
	Expected   string
}

var errUpdateRunning = errors.New("оновлення вже встановлюється")

func (a *App) updatesDir() (string, error) {
	dir, err := dataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "updates"), nil
}

func defaultAppUpdateSettings() AppUpdateSettings {
	return AppUpdateSettings{AutoCheck: true, AutoDownload: true}
}

func (a *App) loadAppUpdateSettings() AppUpdateSettings {
	settings := defaultAppUpdateSettings()
	dir, err := dataDir()
	if err != nil {
		return settings
	}
	if err := readJSONFile(filepath.Join(dir, updateSettingsName), &settings); err != nil {
		return defaultAppUpdateSettings()
	}
	if !settings.AutoCheck {
		settings.AutoDownload = false
	}
	return settings
}

func (a *App) saveAppUpdateSettings(settings AppUpdateSettings) error {
	dir, err := dataDir()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(filepath.Join(dir, updateSettingsName), append(data, '\n'), 0o644)
}

func (a *App) GetAppUpdateSettings() AppUpdateSettings {
	return a.loadAppUpdateSettings()
}

// SetAppUpdateSettings is idempotent: turning checking off also turns off the
// background download, because the app can no longer know about new releases.
func (a *App) SetAppUpdateSettings(autoCheck, autoDownload bool) (AppUpdateSettings, error) {
	previous := a.loadAppUpdateSettings()
	settings := previous
	settings.AutoCheck = autoCheck
	settings.AutoDownload = autoCheck && autoDownload
	a.mu.Lock()
	a.updateSettings = settings
	a.mu.Unlock()
	err := a.saveAppUpdateSettings(settings)
	if err == nil && autoCheck && !previous.AutoCheck {
		// Turning checks back on should not wait for the next six-hour tick.
		go a.runAutoCheck()
	}
	return settings, err
}

// InstallAppUpdate replaces the running executable with the downloaded one and
// restarts ReadyWin. The swap itself is done by a helper after this process
// exits, so a partial copy can never leave a half-written binary behind.
func (a *App) InstallAppUpdate(path string) (AppUpdateResult, error) {
	info := a.GetAppUpdate(false)
	if !info.Available || info.LatestVersion == "" {
		return AppUpdateResult{}, errors.New("немає доступного оновлення")
	}
	if info.Checksum == "" {
		return AppUpdateResult{}, errors.New("у релізі немає SHA256 — оновлення відхилено")
	}

	source, err := a.validatedUpdateFile(path)
	if err != nil {
		return AppUpdateResult{}, err
	}
	sum, err := fileSHA256(source)
	if err != nil {
		return AppUpdateResult{}, err
	}
	if !strings.EqualFold(sum, info.Checksum) {
		return AppUpdateResult{}, errors.New("SHA256 завантаженого файлу не збігається з релізом")
	}

	target, err := currentExecutable()
	if err != nil {
		return AppUpdateResult{}, err
	}
	if strings.EqualFold(target, source) {
		return AppUpdateResult{}, errors.New("оновлення не може замінити саме себе")
	}

	a.mu.Lock()
	if a.updateApplying {
		a.mu.Unlock()
		return AppUpdateResult{}, errUpdateRunning
	}
	a.updateApplying = true
	a.mu.Unlock()

	release := func() {
		a.mu.Lock()
		a.updateApplying = false
		a.mu.Unlock()
	}

	result := AppUpdateResult{
		Status:   "applying",
		Version:  info.LatestVersion,
		Previous: appVersion,
		At:       time.Now().UTC().Format(time.RFC3339),
	}

	elevated := !canWriteDir(filepath.Dir(target))
	plan, err := a.newUpdatePlan(source, target, info.LatestVersion, info.Checksum, elevated)
	if err != nil {
		release()
		return AppUpdateResult{}, err
	}
	if err := writeJSONAtomic(plan.journalPath(), updateJournal{
		Version:    info.LatestVersion,
		Previous:   appVersion,
		Target:     plan.Target,
		Backup:     plan.Backup,
		Staged:     plan.Staged,
		Source:     plan.Source,
		LogPath:    plan.LogPath,
		ResultPath: plan.ResultPath,
		StartedAt:  result.At,
		Elevated:   elevated,
	}); err != nil {
		release()
		return AppUpdateResult{}, err
	}

	if elevated {
		if err := runUpdateElevated(plan); err != nil {
			release()
			_ = os.Remove(plan.journalPath())
			return AppUpdateResult{}, err
		}
	} else {
		if err := startUpdateHelper(plan); err != nil {
			release()
			_ = os.Remove(plan.journalPath())
			return AppUpdateResult{}, err
		}
		if err := waitForUpdateReady(plan.ReadyPath, 15*time.Second); err != nil {
			release()
			_ = os.Remove(plan.journalPath())
			return AppUpdateResult{}, err
		}
	}

	result.Elevated = elevated
	go func() {
		time.Sleep(600 * time.Millisecond)
		if a.ctx != nil {
			wruntime.Quit(a.ctx)
		}
	}()
	return result, nil
}

// RunAppUpdate downloads (when needed) and installs the latest release in one
// action, which is what the banner and the System page call.
func (a *App) RunAppUpdate() (AppUpdateResult, error) {
	info := a.GetAppUpdate(true)
	if info.Error != "" {
		return AppUpdateResult{}, errors.New(info.Error)
	}
	if !info.Available {
		return AppUpdateResult{}, errors.New("у вас остання версія")
	}
	dir, err := a.updatesDir()
	if err != nil {
		return AppUpdateResult{}, err
	}
	available, err := a.findDownloadedUpdate(dir, info)
	if err != nil {
		return AppUpdateResult{}, err
	}
	if available == "" {
		if _, err := a.DownloadAppUpdate(); err != nil {
			return AppUpdateResult{}, err
		}
		if available, err = a.findDownloadedUpdate(dir, info); err != nil {
			return AppUpdateResult{}, err
		}
	}
	if available == "" {
		return AppUpdateResult{}, errors.New("завантажений файл оновлення не знайдено")
	}
	return a.InstallAppUpdate(available)
}

func (p updatePlan) journalPath() string {
	return filepath.Join(filepath.Dir(p.ResultPath), updateJournalName)
}

func (a *App) newUpdatePlan(source, target, version, checksum string, elevated bool) (updatePlan, error) {
	dir, err := a.updatesDir()
	if err != nil {
		return updatePlan{}, err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return updatePlan{}, err
	}
	runDir := filepath.Join(dir, fmt.Sprintf("apply-%d", time.Now().UnixNano()))
	if err := os.MkdirAll(runDir, 0o755); err != nil {
		return updatePlan{}, err
	}
	targetDir := filepath.Dir(target)
	plan := updatePlan{
		ProcessID:  os.Getpid(),
		Source:     source,
		Target:     target,
		Backup:     filepath.Join(targetDir, ".ReadyWin.previous.exe"),
		Staged:     filepath.Join(targetDir, ".ReadyWin.updating.exe"),
		LogPath:    filepath.Join(dir, updateLogName),
		ResultPath: filepath.Join(dir, updateResultName),
		ReadyPath:  filepath.Join(runDir, updateReadyName),
		Version:    version,
		Previous:   appVersion,
		Expected:   strings.ToLower(checksum),
	}
	scriptPath := filepath.Join(runDir, "apply.ps1")
	if err := writePowerShellScript(scriptPath, buildUpdateScript(plan, elevated)); err != nil {
		return updatePlan{}, err
	}
	return plan, nil
}

// buildUpdateScript is kept as a pure function so the generated helper can be
// reviewed and tested without touching the real executable.
func buildUpdateScript(plan updatePlan, elevated bool) string {
	var b strings.Builder
	b.WriteString("$ErrorActionPreference = 'Stop'\r\n")
	b.WriteString("$ProgressPreference = 'SilentlyContinue'\r\n")
	b.WriteString("$log = " + psQuote(plan.LogPath) + "\r\n")
	b.WriteString("$result = " + psQuote(plan.ResultPath) + "\r\n")
	b.WriteString("$ready = " + psQuote(plan.ReadyPath) + "\r\n")
	b.WriteString("$source = " + psQuote(plan.Source) + "\r\n")
	b.WriteString("$target = " + psQuote(plan.Target) + "\r\n")
	b.WriteString("$backup = " + psQuote(plan.Backup) + "\r\n")
	b.WriteString("$staged = " + psQuote(plan.Staged) + "\r\n")
	b.WriteString("$version = " + psQuote(plan.Version) + "\r\n")
	b.WriteString("$previous = " + psQuote(plan.Previous) + "\r\n")
	b.WriteString("$expected = " + psQuote(plan.Expected) + "\r\n")
	b.WriteString("$processId = " + fmt.Sprintf("%d", plan.ProcessID) + "\r\n")
	b.WriteString("$elevated = " + psBool(elevated) + "\r\n")
	b.WriteString(`$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-UpdateLog([string]$message) {
  try {
    [System.IO.File]::AppendAllText($log, ((Get-Date).ToString('s') + ' ' + $message + [Environment]::NewLine), $utf8)
  } catch { }
}
function Save-UpdateResult([string]$status, [string]$message) {
  try {
    $payload = [ordered]@{
      status = $status
      version = $version
      previous = $previous
      message = $message
      at = (Get-Date).ToUniversalTime().ToString('o')
      elevated = $elevated
    }
    [System.IO.File]::WriteAllText($result, ($payload | ConvertTo-Json -Compress), $utf8)
  } catch { }
}
try { [System.IO.File]::WriteAllText($ready, 'ready') } catch { }
Write-UpdateLog 'update helper started'
$deadline = (Get-Date).AddSeconds(` + fmt.Sprintf("%d", int(updateExitTimeout.Seconds())) + `)
while ((Get-Date) -lt $deadline) {
  if (-not (Get-Process -Id $processId -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Milliseconds 200
}
if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
  Write-UpdateLog 'ReadyWin did not exit in time'
  Save-UpdateResult 'failed' 'ReadyWin не завершився за 120 секунд'
  exit 1
}
try {
  if (-not (Test-Path -LiteralPath $source)) { throw 'файл оновлення зник' }
  if (-not (Test-Path -LiteralPath $target)) { throw 'поточний файл ReadyWin не знайдено' }
  Copy-Item -LiteralPath $source -Destination $staged -Force
  $hash = (Get-FileHash -LiteralPath $staged -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $expected) { throw 'SHA256 завантаженого файлу не збігається' }
  Write-UpdateLog 'staged copy verified'
  $swapped = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    try {
      if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
      Move-Item -LiteralPath $target -Destination $backup -Force
      try {
        Move-Item -LiteralPath $staged -Destination $target -Force
        $swapped = $true
        break
      } catch {
        Move-Item -LiteralPath $backup -Destination $target -Force
        throw
      }
    } catch {
      Write-UpdateLog ('swap attempt failed at line ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.Exception.Message)
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $swapped) { throw 'не вдалося замінити виконуваний файл' }
  Write-UpdateLog 'binary swapped'
  $targetDir = [System.IO.Path]::GetDirectoryName($target)
  Set-Location -LiteralPath $targetDir
  Start-Process -FilePath $target | Out-Null
  Write-UpdateLog 'new version started'
  Save-UpdateResult 'installed' ''
  Remove-Item -LiteralPath $source -Force -ErrorAction SilentlyContinue
  exit 0
} catch {
  Write-UpdateLog ('update failed at line ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.Exception.Message + ' | ' + $_.InvocationInfo.Line.Trim())
  Save-UpdateResult 'failed' $_.Exception.Message
  exit 1
}
`)
	return b.String()
}

func psBool(value bool) string {
	if value {
		return "$true"
	}
	return "$false"
}

func buildElevatedLauncher(scriptPath, readyPath, exitPath string) string {
	return `$ErrorActionPreference = 'Stop'
$script = ` + psQuote(scriptPath) + "\r\n" +
		`$ready = ` + psQuote(readyPath) + "\r\n" +
		`$exit = ` + psQuote(exitPath) + "\r\n" +
		`try {
  $null = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$script) -Verb RunAs -WindowStyle Hidden -PassThru
  $deadline = (Get-Date).AddSeconds(45)
  while (-not (Test-Path -LiteralPath $ready) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  if (Test-Path -LiteralPath $ready) { Set-Content -LiteralPath $exit -Value 'READY' -Encoding ASCII }
  else { Set-Content -LiteralPath $exit -Value 'TIMEOUT' -Encoding ASCII }
} catch {
  Set-Content -LiteralPath $exit -Value 'UAC_CANCELLED' -Encoding ASCII
}
`
}

func runUpdateElevated(plan updatePlan) error {
	scriptPath := filepath.Join(filepath.Dir(plan.ReadyPath), "apply.ps1")
	exitPath := filepath.Join(filepath.Dir(plan.ReadyPath), "launcher-exit.txt")
	launcherPath := filepath.Join(filepath.Dir(plan.ReadyPath), "launcher.ps1")
	if err := writePowerShellScript(launcherPath, buildElevatedLauncher(scriptPath, plan.ReadyPath, exitPath)); err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", launcherPath)
	cmd.SysProcAttr = hiddenProcess()
	out, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return errors.New("UAC не відповів вчасно")
	}
	exit, _ := os.ReadFile(exitPath)
	status := strings.TrimSpace(string(exit))
	switch status {
	case "READY":
		return nil
	case "UAC_CANCELLED":
		return errors.New("запит прав адміністратора скасовано")
	default:
		detail := strings.TrimSpace(string(out))
		if detail != "" {
			return fmt.Errorf("не вдалося запустити оновлення: %s", truncateText(detail, 200))
		}
		if err != nil {
			return fmt.Errorf("не вдалося запустити оновлення: %v", err)
		}
		return errors.New("оновлення не підтвердило запуск")
	}
}

func waitForUpdateReady(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(path); err == nil {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return errors.New("хелпер оновлення не запустився")
}

func startUpdateHelper(plan updatePlan) error {
	scriptPath := filepath.Join(filepath.Dir(plan.ReadyPath), "apply.ps1")
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath)
	cmd.SysProcAttr = hiddenProcess()
	cmd.Stdout = nil
	cmd.Stderr = nil
	return cmd.Start()
}

func (a *App) validatedUpdateFile(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	dir, err := a.updatesDir()
	if err != nil {
		return "", err
	}
	dir, err = filepath.Abs(dir)
	if err != nil {
		return "", err
	}
	relative, err := filepath.Rel(dir, abs)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(os.PathSeparator)) || filepath.IsAbs(relative) {
		return "", errors.New("некоректний шлях до оновлення")
	}
	if !strings.EqualFold(filepath.Ext(abs), ".exe") {
		return "", errors.New("оновлення має бути EXE")
	}
	info, err := os.Stat(abs)
	if err != nil || !info.Mode().IsRegular() || info.Size() == 0 {
		return "", errors.New("файл оновлення не знайдено")
	}
	return abs, nil
}

func (a *App) findDownloadedUpdate(dir string, info AppUpdateInfo) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", nil
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".exe") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		sum, err := fileSHA256(path)
		if err != nil {
			continue
		}
		if info.Checksum != "" && strings.EqualFold(sum, info.Checksum) {
			return path, nil
		}
	}
	return "", nil
}

func fileSHA256(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()
	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}

func currentExecutable() (string, error) {
	path, err := os.Executable()
	if err != nil {
		return "", err
	}
	if resolved, err := filepath.EvalSymlinks(path); err == nil {
		path = resolved
	}
	return filepath.Abs(path)
}

func canWriteDir(dir string) bool {
	probe, err := os.CreateTemp(dir, ".readywin-probe-*")
	if err != nil {
		return false
	}
	name := probe.Name()
	_ = probe.Close()
	_ = os.Remove(name)
	return true
}

func writeJSONAtomic(path string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(path, append(data, '\n'), 0o644)
}

// writePowerShellScript writes UTF-8 with a BOM. Windows PowerShell 5.1 reads
// BOM-less .ps1 files as ANSI, which corrupts the Cyrillic messages below.
func writePowerShellScript(path, script string) error {
	payload := make([]byte, 0, len(script)+3)
	payload = append(payload, 0xEF, 0xBB, 0xBF)
	payload = append(payload, script...)
	return os.WriteFile(path, payload, 0o644)
}

// readJSONFile tolerates the BOM that PowerShell may prepend to its output.
func readJSONFile(path string, value any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
	return json.Unmarshal(data, value)
}

// reconcileAppUpdate runs on startup. It reports the outcome of the swap that
// happened while the previous process was closing and rolls the old binary back
// when the helper never managed to finish.
func (a *App) reconcileAppUpdate() {
	dir, err := a.updatesDir()
	if err != nil {
		return
	}
	journalPath := filepath.Join(dir, updateJournalName)
	resultPath := filepath.Join(dir, updateResultName)

	var journal updateJournal
	if err := readJSONFile(journalPath, &journal); err == nil && journal.Target != "" {
		a.finishInterruptedUpdate(dir, journal, resultPath)
		_ = os.Remove(journalPath)
	}

	var result AppUpdateResult
	if err := readJSONFile(resultPath, &result); err == nil && result.Status != "" {
		settings := a.loadAppUpdateSettings()
		settings.LastResult = &result
		_ = a.saveAppUpdateSettings(settings)
		_ = os.Remove(resultPath)
	}

	if journal.Backup != "" || journal.Staged != "" {
		if result.Status == "installed" {
			_ = os.Remove(journal.Backup)
			_ = os.Remove(journal.Staged)
		}
	}
	cleanupUpdatesDir(dir)
}

func (a *App) finishInterruptedUpdate(dir string, journal updateJournal, resultPath string) {
	var result AppUpdateResult
	_ = readJSONFile(resultPath, &result)
	if result.Status == "installed" && sameVersion(result.Version, appVersion) {
		return
	}
	// The new binary never started. Put the old one back if the helper had
	// already moved it away, so the user is never left without an app.
	if journal.Backup != "" && journal.Target != "" {
		if _, err := os.Stat(journal.Target); os.IsNotExist(err) {
			_ = os.Rename(journal.Backup, journal.Target)
		}
	}
	if result.Status == "installed" {
		return
	}
	message := strings.TrimSpace(result.Message)
	if message == "" && journal.LogPath != "" {
		message = tailFile(journal.LogPath, updateLogTailLimit)
	}
	if message == "" {
		message = "оновлення не завершилося"
	}
	failed := AppUpdateResult{
		Status:   "failed",
		Version:  journal.Version,
		Previous: journal.Previous,
		Message:  message,
		At:       time.Now().UTC().Format(time.RFC3339),
		Elevated: journal.Elevated,
	}
	_ = writeJSONAtomic(resultPath, failed)
}

func sameVersion(left, right string) bool {
	leftVersion, leftOK := parseAppVersion(left)
	rightVersion, rightOK := parseAppVersion(right)
	if !leftOK || !rightOK {
		return strings.TrimSpace(left) == strings.TrimSpace(right)
	}
	return compareAppVersions(leftVersion, rightVersion) == 0
}

func tailFile(path string, limit int) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return ""
	}
	offset := info.Size() - int64(limit)
	if offset < 0 {
		offset = 0
	}
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return ""
	}
	data, err := io.ReadAll(io.LimitReader(file, int64(limit)))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// cleanupUpdatesDir keeps the downloaded installers small in number and drops
// stale results, so the data folder does not grow without bound.
func cleanupUpdatesDir(dir string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	type item struct {
		path    string
		modTime time.Time
	}
	exes := make([]item, 0, len(entries))
	now := time.Now()
	for _, entry := range entries {
		path := filepath.Join(dir, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if entry.IsDir() {
			if now.Sub(info.ModTime()) > 24*time.Hour {
				_ = os.RemoveAll(path)
			}
			continue
		}
		switch {
		case strings.HasSuffix(strings.ToLower(entry.Name()), ".exe"):
			exes = append(exes, item{path: path, modTime: info.ModTime()})
		case entry.Name() == updateResultName && now.Sub(info.ModTime()) > updateResultTTL:
			_ = os.Remove(path)
		}
	}
	if len(exes) <= updateKeepFiles {
		return
	}
	for i := 0; i < len(exes); i++ {
		for j := i + 1; j < len(exes); j++ {
			if exes[j].modTime.After(exes[i].modTime) {
				exes[i], exes[j] = exes[j], exes[i]
			}
		}
	}
	for _, old := range exes[updateKeepFiles:] {
		_ = os.Remove(old.path)
	}
}

// autoCheckAppUpdate is the background part of the update settings: it checks
// silently, and optionally downloads in advance so the user only has to restart.
func (a *App) autoCheckAppUpdate() {
	// The ticker runs even when checking is disabled so that re-enabling the
	// setting takes effect without restarting the app; runAutoCheck reads the
	// current settings on every tick.
	time.Sleep(updateAutoStartGap)
	ticker := time.NewTicker(updateAutoCheckGap)
	defer ticker.Stop()
	for {
		a.runAutoCheck()
		<-ticker.C
	}
}

func (a *App) runAutoCheck() {
	settings := a.loadAppUpdateSettings()
	if !settings.AutoCheck {
		return
	}
	info := a.GetAppUpdate(true)
	if info.CheckedAt != "" && info.Error == "" {
		settings.LastCheck = info.CheckedAt
		_ = a.saveAppUpdateSettings(settings)
	}
	if info.Error != "" || !info.Available || a.ctx == nil {
		return
	}
	wruntime.EventsEmit(a.ctx, "appupdate:available", info)
	if !settings.AutoDownload {
		return
	}
	a.mu.Lock()
	busy := a.install.Active
	a.mu.Unlock()
	if busy {
		return
	}
	dir, err := a.updatesDir()
	if err != nil {
		return
	}
	if existing, _ := a.findDownloadedUpdate(dir, info); existing != "" {
		wruntime.EventsEmit(a.ctx, "appupdate:ready", AppUpdateDownload{Path: existing, SHA256: info.Checksum})
		return
	}
	download, err := a.DownloadAppUpdate()
	if err != nil {
		wruntime.EventsEmit(a.ctx, "appupdate:downloadError", err.Error())
		return
	}
	wruntime.EventsEmit(a.ctx, "appupdate:ready", download)
}
