package main

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type InstalledChange struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type InstallItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	ExitCode int    `json:"exitCode,omitempty"`
	Message  string `json:"message,omitempty"`
	// Note carries a canonical hint ("installed", "already", "upgraded", "uptodate",
	// "removed", "repaired", "notinstalled", "restart", "skipped", "failed").
	Note string `json:"note,omitempty"`
}

type InstallState struct {
	Active     bool          `json:"active"`
	Cancelling bool          `json:"cancelling"`
	Finished   bool          `json:"finished"`
	StartedAt  string        `json:"startedAt,omitempty"`
	FinishedAt string        `json:"finishedAt,omitempty"`
	Items      []InstallItem `json:"items"`
	Current    string        `json:"current,omitempty"`
	Success    bool          `json:"success"`
	Cancelled  bool          `json:"cancelled"`
	Message    string        `json:"message,omitempty"`
	Code       string        `json:"code,omitempty"`
	// Mode is "install", "upgrade", "uninstall" or "repair".
	Mode          string            `json:"mode,omitempty"`
	OKCount       int               `json:"okCount"`
	FailCount     int               `json:"failCount"`
	SkippedCount  int               `json:"skippedCount"`
	BaselineCount int               `json:"baselineCount"`
	Added         []InstalledChange `json:"added"`
	Removed       []InstalledChange `json:"removed"`
}

type InstallEvent struct {
	Type  string       `json:"type"`
	State InstallState `json:"state"`
	Line  string       `json:"line,omitempty"`
}

type installRun struct {
	Dir             string
	ScriptPath      string
	LauncherPath    string
	LogPath         string
	LauncherLogPath string
	CancelPath      string
	ExitPath        string
	WingetPath      string
	Command         string
	Baseline        map[string]InstalledApp
	Restart         map[string]bool
}

const (
	wgInstall   = "install"
	wgUpgrade   = "upgrade"
	wgUninstall = "uninstall"
	wgRepair    = "repair"
)

var wingetIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+-]*$`)

// restartHint matches winget's wording for packages that only switch to the new
// version once the app (or the system) is restarted, which is common for MSIX.
var restartHint = regexp.MustCompile(`(?i)restart the application|restart is required|a restart is required|needs? to be restarted|перезапуст`)

func (a *App) StartInstall(ids []string) (InstallState, error) {
	return a.startQueue(wgInstall, ids)
}

func (a *App) StartUpgrade(ids []string) (InstallState, error) {
	return a.startQueue(wgUpgrade, ids)
}

func (a *App) StartUninstall(ids []string) (InstallState, error) {
	return a.startQueue(wgUninstall, ids)
}

func (a *App) StartRepair(ids []string) (InstallState, error) {
	return a.startQueue(wgRepair, ids)
}

func (a *App) startQueue(command string, ids []string) (InstallState, error) {
	cat, err := loadCatalog()
	if err != nil {
		return InstallState{}, err
	}
	byID := make(map[string]Item, len(cat.Items))
	for _, item := range cat.Items {
		byID[item.ID] = item
	}

	seen := make(map[string]bool)
	queue := make([]InstallItem, 0, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}
		if !wingetIDPattern.MatchString(id) {
			return InstallState{}, fmt.Errorf("некоректний ідентифікатор пакета: %s", id)
		}
		item, ok := byID[id]
		if !ok {
			return InstallState{}, fmt.Errorf("пакет відсутній у каталозі: %s", id)
		}
		seen[id] = true
		queue = append(queue, InstallItem{ID: id, Name: item.Name, Status: "pending"})
	}
	if len(queue) == 0 {
		return InstallState{}, errors.New("черга порожня")
	}

	base, err := dataDir()
	if err != nil {
		return InstallState{}, err
	}
	runDir := filepath.Join(base, "runs", fmt.Sprintf("%s-%d", time.Now().Format("20060102-150405"), time.Now().UnixNano()))
	if err := os.MkdirAll(runDir, 0o755); err != nil {
		return InstallState{}, err
	}

	wingetPath, _ := exec.LookPath("winget")
	run := &installRun{
		Dir:             runDir,
		ScriptPath:      filepath.Join(runDir, "install.ps1"),
		LauncherPath:    filepath.Join(runDir, "launcher.ps1"),
		LogPath:         filepath.Join(runDir, "install.log"),
		LauncherLogPath: filepath.Join(runDir, "launcher.log"),
		CancelPath:      filepath.Join(runDir, "cancel.flag"),
		ExitPath:        filepath.Join(runDir, "exit.txt"),
		WingetPath:      wingetPath,
		Command:         command,
		Baseline:        a.detectInstalled(cat),
		Restart:         map[string]bool{},
	}

	// The launcher lives in its own file: passing a multi-line script through
	// `powershell -Command` mangles the quotes of the inner path.
	if err := os.WriteFile(run.ScriptPath, []byte(buildInstallScript(run, queue)), 0o644); err != nil {
		return InstallState{}, err
	}
	if err := os.WriteFile(run.LauncherPath, []byte(buildLauncher(run)), 0o644); err != nil {
		return InstallState{}, err
	}

	state := InstallState{
		Active:        true,
		StartedAt:     time.Now().Format(time.RFC3339),
		Items:         queue,
		Mode:          command,
		Message:       "Очікує підтвердження UAC",
		BaselineCount: len(run.Baseline),
		Added:         []InstalledChange{},
		Removed:       []InstalledChange{},
	}

	a.mu.Lock()
	if a.install.Active {
		a.mu.Unlock()
		return InstallState{}, errors.New("операція вже виконується")
	}
	a.install = state
	a.run = run
	a.mu.Unlock()

	a.emitInstall(InstallEvent{Type: "state", State: a.InstallSnapshot()})
	go a.runInstall(run)
	return a.InstallSnapshot(), nil
}

func (a *App) CancelInstall() (InstallState, error) {
	a.mu.Lock()
	if !a.install.Active {
		state := cloneState(a.install)
		a.mu.Unlock()
		return state, nil
	}
	a.install.Cancelling = true
	a.install.Message = "Скасування після поточного пакета"
	run := a.run
	state := cloneState(a.install)
	a.mu.Unlock()

	if run != nil {
		_ = os.WriteFile(run.CancelPath, []byte("cancel"), 0o644)
	}
	a.emitInstall(InstallEvent{Type: "state", State: state})
	return state, nil
}

func (a *App) GetInstallState() InstallState {
	return a.InstallSnapshot()
}

func (a *App) InstallSnapshot() InstallState {
	a.mu.Lock()
	defer a.mu.Unlock()
	return cloneState(a.install)
}

func cloneState(state InstallState) InstallState {
	copyState := state
	copyState.Items = append([]InstallItem(nil), state.Items...)
	copyState.Added = append([]InstalledChange(nil), state.Added...)
	copyState.Removed = append([]InstalledChange(nil), state.Removed...)
	return copyState
}

func (a *App) emitInstall(event InstallEvent) {
	if a.ctx == nil {
		return
	}
	wruntime.EventsEmit(a.ctx, "install:event", event)
}

func buildInstallScript(run *installRun, queue []InstallItem) string {
	var b strings.Builder
	b.WriteString("$ErrorActionPreference = 'Continue'\r\n")
	b.WriteString("$ProgressPreference = 'SilentlyContinue'\r\n")
	b.WriteString("$log = " + psQuote(run.LogPath) + "\r\n")
	b.WriteString("$cancel = " + psQuote(run.CancelPath) + "\r\n")
	b.WriteString("function Write-FW([string]$line) { try { [System.IO.File]::AppendAllText($log, $line + [Environment]::NewLine, [System.Text.Encoding]::UTF8) } catch { } }\r\n")
	b.WriteString("Write-FW '::FW_BOOT'\r\n")
	ids := make([]string, 0, len(queue))
	for _, item := range queue {
		ids = append(ids, psQuote(item.ID))
	}
	b.WriteString("$ids = @(" + strings.Join(ids, ", ") + ")\r\n")
	winget := run.WingetPath
	if winget == "" {
		winget = "winget"
	}
	b.WriteString("$winget = " + psQuote(winget) + "\r\n")
	subcommand := wgInstall
	extra := " --no-upgrade"
	accept := " --accept-package-agreements --accept-source-agreements"
	alreadyPattern := `already installed|No newer package|No applicable|No available upgrade|already exists`
	switch run.Command {
	case wgUpgrade:
		subcommand = wgUpgrade
		extra = ""
	case wgUninstall:
		subcommand = wgUninstall
		extra = ""
		accept = " --accept-source-agreements"
		alreadyPattern = `No installed package|not installed|No applicable|No available|already uninstalled`
	case wgRepair:
		subcommand = wgRepair
		extra = ""
		alreadyPattern = `No applicable|already installed|No available|not installed`
	}
	b.WriteString("$already = " + psQuote(alreadyPattern) + "\r\n")
	b.WriteString("try {\r\n")
	b.WriteString("  foreach ($id in $ids) {\r\n")
	b.WriteString("    if (Test-Path -LiteralPath $cancel) { Write-FW '::FW_CANCELLED'; break }\r\n")
	b.WriteString("    Write-FW ('::FW_ITEM_START|' + $id)\r\n")
	b.WriteString("    $lines = New-Object 'System.Collections.Generic.List[string]'\r\n")
	b.WriteString("    $code = -1\r\n")
	b.WriteString("    try {\r\n")
	b.WriteString("      & $winget " + subcommand + " --id $id --exact --source winget --silent" + extra + accept + " --disable-interactivity 2>&1 | ForEach-Object {\r\n")
	b.WriteString("        $line = [string]$_\r\n")
	b.WriteString("        $lines.Add($line)\r\n")
	b.WriteString("        Write-FW ('::FW_LOG|' + $id + '|' + $line)\r\n")
	b.WriteString("      }\r\n")
	b.WriteString("      $code = $LASTEXITCODE\r\n")
	b.WriteString("    } catch {\r\n")
	b.WriteString("      $line = [string]$_.Exception.Message\r\n")
	b.WriteString("      $lines.Add($line)\r\n")
	b.WriteString("      Write-FW ('::FW_LOG|' + $id + '|' + $line)\r\n")
	b.WriteString("      $code = -1\r\n")
	b.WriteString("    }\r\n")
	b.WriteString("    $text = [string]::Join([Environment]::NewLine, $lines)\r\n")
	b.WriteString("    if ($code -eq 0 -or $code -eq 3010 -or $code -eq 1641 -or $code -eq -1978335189 -or $code -eq -1978335135 -or $code -eq -1978335216) {\r\n")
	b.WriteString("      Write-FW ('::FW_ITEM_OK|' + $id + '|' + $code)\r\n")
	b.WriteString("    } elseif ($text -match $already) {\r\n")
	b.WriteString("      Write-FW ('::FW_ITEM_OK|' + $id + '|' + $code + '|already')\r\n")
	b.WriteString("    } else {\r\n")
	b.WriteString("      Write-FW ('::FW_ITEM_FAIL|' + $id + '|' + $code)\r\n")
	b.WriteString("    }\r\n")
	b.WriteString("  }\r\n")
	b.WriteString("} catch {\r\n")
	b.WriteString("  Write-FW ('::FW_FATAL|' + $_.Exception.Message)\r\n")
	b.WriteString("}\r\n")
	b.WriteString("Write-FW '::FW_END'\r\n")
	return b.String()
}

func buildLauncher(run *installRun) string {
	var b strings.Builder
	b.WriteString("$ErrorActionPreference = 'Stop'\r\n")
	b.WriteString("$script = " + psQuote(run.ScriptPath) + "\r\n")
	b.WriteString("$exit = " + psQuote(run.ExitPath) + "\r\n")
	b.WriteString("$arg = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"' + $script + '\"'\r\n")
	b.WriteString("try {\r\n")
	b.WriteString("  $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $arg -Verb RunAs -WindowStyle Hidden -PassThru\r\n")
	b.WriteString("  if ($p) { $p.WaitForExit(); Set-Content -LiteralPath $exit -Value $p.ExitCode -Encoding ASCII }\r\n")
	b.WriteString("} catch {\r\n")
	b.WriteString("  Set-Content -LiteralPath $exit -Value 'UAC_CANCELLED' -Encoding ASCII\r\n")
	b.WriteString("  Write-Output $_.Exception.Message\r\n")
	b.WriteString("}\r\n")
	return b.String()
}

func psQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func (a *App) runInstall(run *installRun) {
	launcherLog, logErr := os.Create(run.LauncherLogPath)
	if logErr != nil {
		launcherLog = nil
	}

	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", run.LauncherPath)
	cmd.SysProcAttr = hiddenProcess()
	if launcherLog != nil {
		cmd.Stdout = launcherLog
		cmd.Stderr = launcherLog
	}
	if err := cmd.Start(); err != nil {
		if launcherLog != nil {
			launcherLog.Close()
		}
		a.finishInstall(run, fmt.Errorf("не вдалося запустити PowerShell: %w", err), false, false)
		return
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	processed := 0
	endSeen := false
	bootSeen := false
	tail := &logTailer{path: run.LogPath}
	defer tail.close()
	consume := func() {
		lines := tail.poll()
		processed += len(lines)
		for _, line := range lines {
			if strings.Contains(line, "::FW_BOOT") {
				bootSeen = true
			}
			if a.handleLogLine(line) {
				endSeen = true
			}
		}
	}

	ticker := time.NewTicker(300 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case err := <-done:
			consume()
			for _, line := range tail.flush() {
				if strings.Contains(line, "::FW_BOOT") {
					bootSeen = true
				}
				if a.handleLogLine(line) {
					endSeen = true
				}
			}
			a.finishInstall(run, err, endSeen, bootSeen)
			if launcherLog != nil {
				launcherLog.Close()
			}
			return
		case <-ticker.C:
			consume()
		}
	}
}

type logTailer struct {
	path    string
	file    *os.File
	pending []byte
	failed  bool
}

// poll reads only the bytes appended since the previous call. The old
// implementation re-read and re-split the whole log every 300 ms, which is
// quadratic for long winget runs.
func (t *logTailer) poll() []string {
	if t.file == nil && !t.failed {
		file, err := os.Open(t.path)
		if err != nil {
			if os.IsNotExist(err) {
				return nil
			}
			t.failed = true
			return nil
		}
		t.file = file
	}
	if t.file == nil {
		return nil
	}
	buf := make([]byte, 64*1024)
	for {
		n, err := t.file.Read(buf)
		if n > 0 {
			t.pending = append(t.pending, buf[:n]...)
		}
		if err != nil || n < len(buf) {
			break
		}
	}
	return t.extract(false)
}

func (t *logTailer) flush() []string {
	return t.extract(true)
}

func (t *logTailer) close() {
	if t.file != nil {
		_ = t.file.Close()
		t.file = nil
	}
}

func (t *logTailer) extract(final bool) []string {
	var lines []string
	for {
		index := bytes.IndexByte(t.pending, '\n')
		if index < 0 {
			break
		}
		line := string(t.pending[:index])
		t.pending = t.pending[index+1:]
		lines = append(lines, cleanLogLine(line))
	}
	if final && len(t.pending) > 0 {
		lines = append(lines, cleanLogLine(string(t.pending)))
		t.pending = nil
	} else if len(t.pending) > 1<<20 {
		// Protect the UI from a malformed log without a newline.
		lines = append(lines, cleanLogLine(string(t.pending)))
		t.pending = nil
	}
	return lines
}

func cleanLogLine(line string) string {
	return strings.TrimSpace(strings.TrimPrefix(line, "\ufeff"))
}

func (a *App) handleLogLine(line string) bool {
	line = strings.TrimSpace(line)
	if line == "" {
		return false
	}
	parts := strings.Split(line, "|")
	switch parts[0] {
	case "::FW_BOOT":
		a.emitInstall(InstallEvent{Type: "log", Line: "elevated install script started", State: a.InstallSnapshot()})
	case "::FW_ITEM_START":
		if len(parts) >= 2 {
			a.mu.Lock()
			a.install.Current = parts[1]
			a.install.Message = modeProgressText(a.install.Mode)
			for i := range a.install.Items {
				if a.install.Items[i].ID == parts[1] {
					a.install.Items[i].Status = "running"
				}
			}
			state := cloneState(a.install)
			a.mu.Unlock()
			a.emitInstall(InstallEvent{Type: "state", State: state})
		}
	case "::FW_ITEM_OK":
		if len(parts) >= 2 {
			code := 0
			if len(parts) >= 3 {
				code, _ = strconv.Atoi(parts[2])
			}
			mode := a.InstallSnapshot().Mode
			message, note := modeSuccessText(mode)
			if len(parts) >= 4 && parts[3] == "already" {
				message, note = modeAlreadyText(mode)
			}
			if mode != wgUninstall && a.pendingRestart(parts[1]) {
				note = "restart"
				message = modeRestartText(mode)
			}
			a.updateItem(parts[1], "ok", code, message, note)
		}
	case "::FW_ITEM_FAIL":
		if len(parts) >= 2 {
			code := 0
			if len(parts) >= 3 {
				code, _ = strconv.Atoi(parts[2])
			}
			a.updateItem(parts[1], "failed", code, modeFailureText(a.InstallSnapshot().Mode), "failed")
		}
	case "::FW_FATAL":
		text := strings.Join(parts[1:], "|")
		a.emitInstall(InstallEvent{Type: "log", Line: "script error: " + text, State: a.InstallSnapshot()})
	case "::FW_CANCELLED":
		a.mu.Lock()
		a.install.Cancelled = true
		a.install.Cancelling = true
		a.install.Message = "Скасовано користувачем"
		state := cloneState(a.install)
		a.mu.Unlock()
		a.emitInstall(InstallEvent{Type: "state", State: state})
		return true
	case "::FW_END":
		return true
	case "::FW_LOG":
		if len(parts) >= 3 {
			text := strings.Join(parts[2:], "|")
			if restartHint.MatchString(text) {
				a.markRestart(parts[1])
			}
			a.emitInstall(InstallEvent{Type: "log", Line: text, State: a.InstallSnapshot()})
		}
	default:
		a.emitInstall(InstallEvent{Type: "log", Line: line, State: a.InstallSnapshot()})
	}
	return false
}

func (a *App) markRestart(id string) {
	a.mu.Lock()
	if a.run != nil && a.run.Restart != nil {
		a.run.Restart[id] = true
	}
	a.mu.Unlock()
}

func (a *App) pendingRestart(id string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.run != nil && a.run.Restart[id]
}

func (a *App) updateItem(id, status string, code int, message, note string) {
	a.mu.Lock()
	a.install.Current = ""
	for i := range a.install.Items {
		if a.install.Items[i].ID == id {
			a.install.Items[i].Status = status
			a.install.Items[i].ExitCode = code
			a.install.Items[i].Message = message
			a.install.Items[i].Note = note
			break
		}
	}
	state := cloneState(a.install)
	a.mu.Unlock()
	a.emitInstall(InstallEvent{Type: "state", State: state})
}

func modeProgressText(mode string) string {
	switch mode {
	case wgUpgrade:
		return "Оновлення"
	case wgUninstall:
		return "Видалення"
	case wgRepair:
		return "Відновлення"
	default:
		return "Встановлення"
	}
}

func modeSuccessText(mode string) (string, string) {
	switch mode {
	case wgUpgrade:
		return "Оновлено", "upgraded"
	case wgUninstall:
		return "Видалено", "removed"
	case wgRepair:
		return "Відновлено", "repaired"
	default:
		return "Встановлено", "installed"
	}
}

func modeAlreadyText(mode string) (string, string) {
	switch mode {
	case wgUpgrade:
		return "Оновлення не потрібне", "uptodate"
	case wgUninstall:
		return "Не було встановлено", "notinstalled"
	case wgRepair:
		return "Уже встановлено", "already"
	default:
		return "Уже встановлено", "already"
	}
}

func modeRestartText(mode string) string {
	switch mode {
	case wgUpgrade:
		return "Оновлено, потрібен перезапуск"
	case wgRepair:
		return "Відновлено, потрібен перезапуск"
	default:
		return "Встановлено, потрібен перезапуск"
	}
}

func modeFailureText(mode string) string {
	switch mode {
	case wgUpgrade:
		return "Помилка оновлення"
	case wgUninstall:
		return "Помилка видалення"
	case wgRepair:
		return "Помилка відновлення"
	default:
		return "Помилка встановлення"
	}
}

func modeResultPast(mode string) string {
	switch mode {
	case wgUpgrade:
		return "Оновлено"
	case wgUninstall:
		return "Видалено"
	case wgRepair:
		return "Відновлено"
	default:
		return "Встановлено"
	}
}

func modeResultVerb(mode string) string {
	switch mode {
	case wgUpgrade:
		return "оновлено"
	case wgUninstall:
		return "видалено"
	case wgRepair:
		return "відновлено"
	default:
		return "встановлено"
	}
}

func modeNoResultText(mode string) string {
	switch mode {
	case wgUpgrade:
		return "Оновлення завершилося без результату. Перевірте журнал."
	case wgUninstall:
		return "Видалення завершилося без результату. Перевірте журнал."
	case wgRepair:
		return "Відновлення завершилося без результату. Перевірте журнал."
	default:
		return "Інсталятор завершився без результату. Перевірте журнал."
	}
}

func (a *App) finishInstall(run *installRun, processErr error, endSeen bool, bootSeen bool) {
	exitData, _ := os.ReadFile(run.ExitPath)
	exitText := strings.TrimSpace(string(exitData))
	_, logErr := os.Stat(run.LogPath)
	logExisted := logErr == nil

	added := []InstalledChange{}
	removed := []InstalledChange{}
	after := map[string]InstalledApp(nil)
	if exitText != "" && exitText != "UAC_CANCELLED" && strings.ContainsAny(exitText, "0123456789") {
		if cat, err := loadCatalog(); err == nil {
			after = a.detectInstalled(cat)
			for id, app := range after {
				if _, ok := run.Baseline[id]; !ok {
					added = append(added, InstalledChange{ID: id, Name: app.Name, Version: app.Version})
				}
			}
			for id, app := range run.Baseline {
				if _, ok := after[id]; !ok {
					removed = append(removed, InstalledChange{ID: id, Name: app.Name})
				}
			}
			sort.Slice(added, func(i, j int) bool { return added[i].Name < added[j].Name })
			sort.Slice(removed, func(i, j int) bool { return removed[i].Name < removed[j].Name })
		}
	}

	a.mu.Lock()
	a.install.Active = false
	a.install.Finished = true
	a.install.FinishedAt = time.Now().Format(time.RFC3339)
	a.install.Current = ""
	cancelled := a.install.Cancelled || a.install.Cancelling
	okCount, failCount, skippedCount := 0, 0, 0
	for i := range a.install.Items {
		item := &a.install.Items[i]
		switch item.Status {
		case "ok":
			okCount++
		case "failed":
			failCount++
		case "pending":
			// Recover lost results: the package may already be in the desired state.
			if after != nil {
				_, exists := after[item.ID]
				switch run.Command {
				case wgUpgrade:
					// Upgrades are not inferable from before/after versions.
				case wgUninstall:
					if !exists {
						item.Status = "ok"
						item.Message = "Видалено"
						item.Note = "removed"
						okCount++
						continue
					}
				case wgRepair:
					if exists {
						item.Status = "ok"
						item.Message = "Відновлено"
						item.Note = "repaired"
						okCount++
						continue
					}
				default:
					if exists {
						item.Status = "ok"
						item.Message = "Уже встановлено"
						item.Note = "already"
						if _, wasThere := run.Baseline[item.ID]; !wasThere {
							item.Message = "Встановлено"
							item.Note = "installed"
						}
						okCount++
						continue
					}
				}
			}
			item.Status = "skipped"
			item.Message = "Пропущено"
			item.Note = "skipped"
			skippedCount++
		}
	}
	a.install.Cancelled = cancelled
	a.install.Added = added
	a.install.Removed = removed
	a.install.OKCount = okCount
	a.install.FailCount = failCount
	a.install.SkippedCount = skippedCount
	past := modeResultPast(run.Command)
	verb := modeResultVerb(run.Command)
	switch {
	case cancelled:
		a.install.Code = "cancelled"
		a.install.Message = fmt.Sprintf("Скасовано. %s %d з %d.", past, okCount, len(a.install.Items))
	case exitText == "UAC_CANCELLED":
		a.install.Code = "uacCancelled"
		a.install.Message = "Запуск скасовано. Підтвердіть запит UAC, щоб продовжити."
	case processErr != nil:
		a.install.Code = "launcherFailed"
		a.install.Message = fmt.Sprintf("Не вдалося запустити підвищений процес: %v. Дивіться launcher.log.", processErr)
	case !logExisted:
		a.install.Code = "noLog"
		code := exitText
		if code == "" {
			code = "?"
		}
		a.install.Message = fmt.Sprintf("Інсталятор не створив журнал (код %s). Дивіться launcher.log у теці запуску.", code)
	case failCount > 0:
		a.install.Code = "withErrors"
		a.install.Message = fmt.Sprintf("Готово з помилками: %d з %d %s.", okCount, len(a.install.Items), verb)
	case okCount == 0:
		a.install.Code = "noResult"
		a.install.Message = modeNoResultText(run.Command)
	default:
		a.install.Code = "done"
		a.install.Success = true
		a.install.Message = fmt.Sprintf("Готово. %s %d з %d.", past, okCount, len(a.install.Items))
	}
	if skippedCount > 0 && !cancelled {
		a.install.Message += fmt.Sprintf(" Пропущено: %d.", skippedCount)
	}
	if len(added) > 0 {
		a.install.Message += fmt.Sprintf(" Нових програм у системі: %d.", len(added))
	}
	if len(removed) > 0 {
		a.install.Message += fmt.Sprintf(" Зникло: %d.", len(removed))
	}
	if !bootSeen && len(added) == 0 && len(removed) == 0 && !cancelled {
		a.install.Success = false
	}
	state := cloneState(a.install)
	a.mu.Unlock()

	_ = saveHistory(historyFromState(state))
	invalidateUpdates()
	cleanupStorage()
	a.emitInstall(InstallEvent{Type: "done", State: state})
}

func (a *App) OpenDataFolder() error {
	dir, err := dataDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return exec.Command("explorer.exe", dir).Start()
}
