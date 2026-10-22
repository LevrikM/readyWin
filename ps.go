package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var errUACCancelled = errors.New("запит UAC скасовано")

// runPowerShell runs a short PowerShell snippet without a window and returns
// UTF-8 output. WMI/CIM queries are intentionally isolated here so the UI can
// fall back gracefully when a provider is missing or access is denied.
func runPowerShell(script string, timeout time.Duration) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	full := "[Console]::OutputEncoding=[Text.Encoding]::UTF8; $OutputEncoding=[Console]::OutputEncoding; $ProgressPreference='SilentlyContinue'; " + script
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", full)
	cmd.SysProcAttr = hiddenProcess()
	out, err := cmd.Output()
	if ctx.Err() == context.DeadlineExceeded {
		return out, fmt.Errorf("PowerShell: перевищено час очікування")
	}
	return out, err
}

func decodeJSONObject(out []byte, target any) error {
	trimmed := bytes.TrimSpace(bytes.TrimPrefix(out, []byte{0xEF, 0xBB, 0xBF}))
	if len(trimmed) == 0 || string(trimmed) == "null" {
		return errors.New("порожня відповідь PowerShell")
	}
	return json.Unmarshal(trimmed, target)
}

// PowerShell 5.1 unwraps single-element arrays in ConvertTo-Json. Accept both
// an array and a single object so WMI results are never rejected just because
// the machine has one disk or one battery.
func decodeJSONArray(out []byte, target any) error {
	trimmed := bytes.TrimSpace(bytes.TrimPrefix(out, []byte{0xEF, 0xBB, 0xBF}))
	if len(trimmed) == 0 || string(trimmed) == "null" {
		return nil
	}
	if trimmed[0] == '{' {
		trimmed = append(append([]byte{'['}, trimmed...), ']')
	}
	return json.Unmarshal(trimmed, target)
}

// runElevatedPowerShell asks for one UAC prompt, runs a generated script in a
// hidden elevated PowerShell and waits for its exit code. Used for actions that
// cannot be performed as the current user (machine-wide startup entries,
// scheduled tasks). The temporary folder is kept on failure for diagnostics.
func runElevatedPowerShell(name, script string, timeout time.Duration) error {
	dir, err := dataDir()
	if err != nil {
		return err
	}
	runDir := filepath.Join(dir, "elevated", fmt.Sprintf("%s-%d", sanitizeFileName(name), time.Now().UnixNano()))
	if err := os.MkdirAll(runDir, 0o755); err != nil {
		return err
	}
	scriptPath := filepath.Join(runDir, "action.ps1")
	launcherPath := filepath.Join(runDir, "launcher.ps1")
	exitPath := filepath.Join(runDir, "exit.txt")
	launcherLogPath := filepath.Join(runDir, "launcher.log")

	if err := os.WriteFile(scriptPath, []byte(script), 0o644); err != nil {
		return err
	}
	launcher := fmt.Sprintf(`$ErrorActionPreference = 'Stop'
$script = '%s'
$exit = '%s'
try {
  $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$script) -Verb RunAs -WindowStyle Hidden -PassThru
  if ($p) {
    $p.WaitForExit()
    Set-Content -LiteralPath $exit -Value ([string]$p.ExitCode) -Encoding ASCII
  }
} catch {
  Set-Content -LiteralPath $exit -Value 'UAC_CANCELLED' -Encoding ASCII
  Write-Output $_.Exception.Message
}
`, psQuote(scriptPath), psQuote(exitPath))
	if err := os.WriteFile(launcherPath, []byte(launcher), 0o644); err != nil {
		return err
	}

	logFile, err := os.Create(launcherLogPath)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", launcherPath)
	cmd.SysProcAttr = hiddenProcess()
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	runErr := cmd.Run()
	_ = logFile.Close()
	if ctx.Err() == context.DeadlineExceeded {
		return errors.New("перевищено час очікування дії з правами адміністратора")
	}
	code, readErr := os.ReadFile(exitPath)
	codeText := strings.TrimSpace(string(code))
	if readErr != nil || codeText == "" {
		detail := ""
		if data, err := os.ReadFile(launcherLogPath); err == nil {
			detail = strings.TrimSpace(string(data))
		}
		if runErr != nil {
			return fmt.Errorf("не вдалося запустити дію: %v %s", runErr, detail)
		}
		return fmt.Errorf("дія не повернула результат %s", detail)
	}
	if strings.EqualFold(codeText, "UAC_CANCELLED") {
		return errUACCancelled
	}
	if codeText != "0" {
		return fmt.Errorf("дія завершилася з кодом %s", codeText)
	}
	_ = os.RemoveAll(runDir)
	return nil
}

func sanitizeFileName(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else if r == ' ' || r == '\\' || r == '/' {
			b.WriteByte('-')
		}
	}
	if b.Len() == 0 {
		return "action"
	}
	return b.String()
}
