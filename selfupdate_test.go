package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSameVersion(t *testing.T) {
	cases := []struct {
		left, right string
		want        bool
	}{
		{"1.2.0", "1.2.0", true},
		{"v1.2.0", "1.2", true},
		{"1.2.0", "1.2.1", false},
		{"", "", true},
		{"nightly", "nightly", true},
	}
	for _, tc := range cases {
		if got := sameVersion(tc.left, tc.right); got != tc.want {
			t.Fatalf("sameVersion(%q, %q) = %v, want %v", tc.left, tc.right, got, tc.want)
		}
	}
}

func TestUpdateSettingsRoundTrip(t *testing.T) {
	t.Setenv("LOCALAPPDATA", t.TempDir())
	app := &App{}

	settings, err := app.SetAppUpdateSettings(false, true)
	if err != nil {
		t.Fatal(err)
	}
	if settings.AutoCheck || settings.AutoDownload {
		t.Fatalf("download must stay off without checking: %+v", settings)
	}
	if loaded := app.GetAppUpdateSettings(); loaded.AutoCheck || loaded.AutoDownload {
		t.Fatalf("settings did not persist: %+v", loaded)
	}

	settings, err = app.SetAppUpdateSettings(true, true)
	if err != nil {
		t.Fatal(err)
	}
	if !settings.AutoCheck || !settings.AutoDownload {
		t.Fatalf("settings were not enabled: %+v", settings)
	}
}

func TestValidatedUpdateFileRejectsEscape(t *testing.T) {
	t.Setenv("LOCALAPPDATA", t.TempDir())
	app := &App{}
	updates, err := app.updatesDir()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(updates, 0o755); err != nil {
		t.Fatal(err)
	}

	outside := filepath.Join(t.TempDir(), "ReadyWin.exe")
	if err := os.WriteFile(outside, []byte("payload"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := app.validatedUpdateFile(outside); err == nil {
		t.Fatal("expected files outside the updates folder to be rejected")
	}

	inside := filepath.Join(updates, "ReadyWin.exe")
	if err := os.WriteFile(inside, []byte("payload"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := app.validatedUpdateFile(inside)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.EqualFold(got, inside) {
		t.Fatalf("validated path = %q, want %q", got, inside)
	}
}

func TestBuildUpdateScriptQuotesPaths(t *testing.T) {
	plan := updatePlan{
		ProcessID:  42,
		Source:     `C:\Users\O'Brien\updates\ReadyWin.exe`,
		Target:     `C:\Program Files\ReadyWin\ReadyWin.exe`,
		Backup:     `C:\Program Files\ReadyWin\.ReadyWin.previous.exe`,
		Staged:     `C:\Program Files\ReadyWin\.ReadyWin.updating.exe`,
		LogPath:    `C:\Users\O'Brien\updates\update.log`,
		ResultPath: `C:\Users\O'Brien\updates\update-result.json`,
		ReadyPath:  `C:\Users\O'Brien\updates\apply-1\update-ready.txt`,
		Version:    "2.0.0",
		Previous:   "1.2.0",
		Expected:   strings.Repeat("a", 64),
	}
	script := buildUpdateScript(plan, true)
	if !strings.Contains(script, `$source = 'C:\Users\O''Brien\updates\ReadyWin.exe'`) {
		t.Fatal("single quotes in paths must be doubled for PowerShell")
	}
	if !strings.Contains(script, "Get-FileHash") || !strings.Contains(script, "$expected") {
		t.Fatal("script must verify the staged copy before swapping")
	}
	if !strings.Contains(script, "Move-Item -LiteralPath $backup -Destination $target") {
		t.Fatal("script must be able to restore the previous binary")
	}
	if !strings.Contains(script, "$processId = 42") {
		t.Fatal("script must wait for the running app to exit")
	}
	if !strings.Contains(script, "Save-UpdateResult 'installed'") {
		t.Fatal("script must report a successful install")
	}
}

func TestFinishInterruptedUpdateRestoresBackup(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "ReadyWin.exe")
	backup := filepath.Join(dir, ".ReadyWin.previous.exe")
	resultPath := filepath.Join(dir, updateResultName)

	if err := os.WriteFile(backup, []byte("old-binary"), 0o644); err != nil {
		t.Fatal(err)
	}
	journal := updateJournal{
		Version:    "2.0.0",
		Previous:   "1.2.0",
		Target:     target,
		Backup:     backup,
		Staged:     filepath.Join(dir, ".ReadyWin.updating.exe"),
		LogPath:    filepath.Join(dir, updateLogName),
		ResultPath: resultPath,
	}
	app := &App{}
	app.finishInterruptedUpdate(dir, journal, resultPath)

	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("old binary was not restored: %v", err)
	}
	if string(data) != "old-binary" {
		t.Fatalf("restored binary = %q", data)
	}
	raw, err := os.ReadFile(resultPath)
	if err != nil {
		t.Fatal(err)
	}
	var result AppUpdateResult
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result.Status != "failed" {
		t.Fatalf("status = %q, want failed", result.Status)
	}
	if result.Version != "2.0.0" {
		t.Fatalf("version = %q", result.Version)
	}
}

// TestUpdateScriptEndToEnd runs the generated helper for real, with harmless
// Windows utilities standing in for ReadyWin. It is opt-in because it starts a
// PowerShell process and briefly launches the "new version".
func TestUpdateScriptEndToEnd(t *testing.T) {
	if os.Getenv("READYWIN_UPDATE_E2E") == "" {
		t.Skip("set READYWIN_UPDATE_E2E=1 to run the PowerShell swap")
	}
	sourceExe := filepath.Join(os.Getenv("SystemRoot"), "System32", "hostname.exe")
	targetExe := filepath.Join(os.Getenv("SystemRoot"), "System32", "where.exe")
	sourceData, err := os.ReadFile(sourceExe)
	if err != nil {
		t.Skipf("test binaries unavailable: %v", err)
	}
	targetData, err := os.ReadFile(targetExe)
	if err != nil {
		t.Skipf("test binaries unavailable: %v", err)
	}

	dir := t.TempDir()
	installDir := filepath.Join(dir, "app")
	if err := os.MkdirAll(installDir, 0o755); err != nil {
		t.Fatal(err)
	}
	source := filepath.Join(dir, "ReadyWin.exe")
	target := filepath.Join(installDir, "ReadyWin.exe")
	if err := os.WriteFile(source, sourceData, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(target, targetData, 0o755); err != nil {
		t.Fatal(err)
	}
	sum, err := fileSHA256(source)
	if err != nil {
		t.Fatal(err)
	}

	plan := updatePlan{
		ProcessID:  999996, // not running, so the helper proceeds immediately
		Source:     source,
		Target:     target,
		Backup:     filepath.Join(installDir, ".ReadyWin.previous.exe"),
		Staged:     filepath.Join(installDir, ".ReadyWin.updating.exe"),
		LogPath:    filepath.Join(dir, updateLogName),
		ResultPath: filepath.Join(dir, updateResultName),
		ReadyPath:  filepath.Join(dir, "run", updateReadyName),
		Version:    "9.9.9",
		Previous:   "1.2.0",
		Expected:   sum,
	}
	if err := os.MkdirAll(filepath.Dir(plan.ReadyPath), 0o755); err != nil {
		t.Fatal(err)
	}
	scriptPath := filepath.Join(filepath.Dir(plan.ReadyPath), "apply.ps1")
	if err := writePowerShellScript(scriptPath, buildUpdateScript(plan, false)); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath)
	cmd.SysProcAttr = hiddenProcess()
	if out, err := cmd.CombinedOutput(); err != nil {
		logContent, _ := os.ReadFile(plan.LogPath)
		t.Fatalf("helper failed: %v\n%s\n%s", err, out, logContent)
	}

	installed, err := fileSHA256(target)
	if err != nil {
		t.Fatal(err)
	}
	if installed != sum {
		t.Fatalf("target hash = %s, want %s", installed, sum)
	}
	if _, err := os.Stat(plan.Source); !os.IsNotExist(err) {
		t.Fatal("downloaded installer should be removed after a successful swap")
	}
	raw, err := os.ReadFile(plan.ResultPath)
	if err != nil {
		t.Fatal(err)
	}
	var result AppUpdateResult
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result.Status != "installed" || result.Version != "9.9.9" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestCleanupUpdatesDirKeepsNewest(t *testing.T) {
	dir := t.TempDir()
	now := time.Now()
	for i := 0; i < 5; i++ {
		path := filepath.Join(dir, "ReadyWin-"+string(rune('a'+i))+".exe")
		if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
		stamp := now.Add(time.Duration(i) * time.Minute)
		if err := os.Chtimes(path, stamp, stamp); err != nil {
			t.Fatal(err)
		}
	}
	stale := filepath.Join(dir, "apply-old")
	if err := os.MkdirAll(stale, 0o755); err != nil {
		t.Fatal(err)
	}
	old := now.Add(-48 * time.Hour)
	if err := os.Chtimes(stale, old, old); err != nil {
		t.Fatal(err)
	}

	cleanupUpdatesDir(dir)

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	exes := 0
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".exe") {
			exes++
			if strings.HasSuffix(entry.Name(), "-a.exe") || strings.HasSuffix(entry.Name(), "-b.exe") {
				t.Fatalf("old installer %q was kept", entry.Name())
			}
		}
	}
	if exes != updateKeepFiles {
		t.Fatalf("kept %d exes, want %d", exes, updateKeepFiles)
	}
	if _, err := os.Stat(stale); !os.IsNotExist(err) {
		t.Fatal("stale apply directory was not removed")
	}
}
