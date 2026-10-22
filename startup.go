package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"golang.org/x/sys/windows/registry"
)

type StartupEntry struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Command   string `json:"command"`
	Location  string `json:"location"`
	Source    string `json:"source"`
	Scope     string `json:"scope"`
	Enabled   bool   `json:"enabled"`
	CanToggle bool   `json:"canToggle"`
	State     string `json:"state,omitempty"`
}

type StartupReport struct {
	CheckedAt string         `json:"checkedAt"`
	Entries   []StartupEntry `json:"entries"`
	Error     string         `json:"error,omitempty"`
}

type runKey struct {
	root         registry.Key
	rootName     string
	path         string
	approvedPath string
	scope        string
	location     string
}

func startupID(kind string, parts ...string) string {
	payload := strings.Join(parts, "\x00")
	return kind + "|" + base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func parseStartupID(id string) (string, []string, error) {
	kind, encoded, ok := strings.Cut(id, "|")
	if !ok || kind == "" || encoded == "" {
		return "", nil, errors.New("некоректний ідентифікатор автозапуску")
	}
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", nil, errors.New("некоректний ідентифікатор автозапуску")
	}
	return kind, strings.Split(string(raw), "\x00"), nil
}

func (a *App) GetStartup() StartupReport {
	report := StartupReport{CheckedAt: time.Now().Format(time.RFC3339), Entries: []StartupEntry{}}
	report.Entries = append(report.Entries, readRegistryStartup()...)
	report.Entries = append(report.Entries, readStartupFolders()...)
	tasks, err := readScheduledTasks()
	if err != nil {
		report.Error = err.Error()
	} else {
		report.Entries = append(report.Entries, tasks...)
	}
	sort.SliceStable(report.Entries, func(i, j int) bool {
		if report.Entries[i].Source != report.Entries[j].Source {
			return startupSourceOrder(report.Entries[i].Source) < startupSourceOrder(report.Entries[j].Source)
		}
		return strings.ToLower(report.Entries[i].Name) < strings.ToLower(report.Entries[j].Name)
	})
	return report
}

func startupSourceOrder(source string) int {
	switch source {
	case "registry":
		return 0
	case "folder":
		return 1
	default:
		return 2
	}
}

func registryStartupKeys() []runKey {
	const current = `Software\Microsoft\Windows\CurrentVersion`
	return []runKey{
		{registry.CURRENT_USER, "HKCU", current + `\Run`, current + `\Explorer\StartupApproved\Run`, "user", `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`},
		{registry.CURRENT_USER, "HKCU", current + `\RunOnce`, "", "user", `HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce`},
		{registry.LOCAL_MACHINE, "HKLM", current + `\Run`, current + `\Explorer\StartupApproved\Run`, "system", `HKLM\Software\Microsoft\Windows\CurrentVersion\Run`},
		{registry.LOCAL_MACHINE, "HKLM", current + `\RunOnce`, "", "system", `HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce`},
		{registry.LOCAL_MACHINE, "HKLM", `Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run`, current + `\Explorer\StartupApproved\Run32`, "system", `HKLM\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run`},
		{registry.LOCAL_MACHINE, "HKLM", `Software\WOW6432Node\Microsoft\Windows\CurrentVersion\RunOnce`, "", "system", `HKLM\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\RunOnce`},
	}
}

func readRegistryStartup() []StartupEntry {
	var entries []StartupEntry
	for _, spec := range registryStartupKeys() {
		key, err := registry.OpenKey(spec.root, spec.path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		names, err := key.ReadValueNames(-1)
		if err != nil {
			key.Close()
			continue
		}
		for _, name := range names {
			command, _, err := key.GetStringValue(name)
			if err != nil || strings.TrimSpace(command) == "" {
				continue
			}
			enabled := true
			if spec.approvedPath != "" {
				if disabled, found := startupApprovedDisabled(spec.root, spec.approvedPath, name); found {
					enabled = !disabled
				}
			}
			entries = append(entries, StartupEntry{
				ID:        startupID("reg", spec.rootName, spec.path, spec.approvedPath, name, spec.scope),
				Name:      name,
				Command:   command,
				Location:  spec.location,
				Source:    "registry",
				Scope:     spec.scope,
				Enabled:   enabled,
				CanToggle: spec.approvedPath != "",
			})
		}
		key.Close()
	}
	return entries
}

func startupApprovedDisabled(root registry.Key, path, name string) (bool, bool) {
	key, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
	if err != nil {
		return false, false
	}
	defer key.Close()
	data, _, err := key.GetBinaryValue(name)
	if err != nil || len(data) == 0 {
		return false, false
	}
	// Task Manager stores 02 for enabled and 03 for disabled (with a timestamp
	// in the remaining bytes). Treat any odd first byte as disabled.
	return data[0]&1 == 1, true
}

func readStartupFolders() []StartupEntry {
	var entries []StartupEntry
	appData := os.Getenv("APPDATA")
	programData := os.Getenv("ProgramData")
	specs := []struct {
		dir      string
		scope    string
		root     registry.Key
		rootName string
	}{
		{filepath.Join(appData, `Microsoft\Windows\Start Menu\Programs\Startup`), "user", registry.CURRENT_USER, "HKCU"},
		{filepath.Join(programData, `Microsoft\Windows\Start Menu\Programs\Startup`), "system", registry.LOCAL_MACHINE, "HKLM"},
	}
	const approved = `Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder`
	for _, spec := range specs {
		if spec.dir == "" {
			continue
		}
		files, err := os.ReadDir(spec.dir)
		if err != nil {
			continue
		}
		for _, file := range files {
			if file.IsDir() || strings.EqualFold(file.Name(), "desktop.ini") {
				continue
			}
			full := filepath.Join(spec.dir, file.Name())
			enabled := true
			if disabled, found := startupApprovedDisabled(spec.root, approved, file.Name()); found {
				enabled = !disabled
			}
			entries = append(entries, StartupEntry{
				ID:        startupID("folder", spec.scope, full),
				Name:      file.Name(),
				Command:   full,
				Location:  spec.dir,
				Source:    "folder",
				Scope:     spec.scope,
				Enabled:   enabled,
				CanToggle: true,
			})
		}
	}
	return entries
}

type psTask struct {
	Name   string `json:"name"`
	Path   string `json:"path"`
	State  string `json:"state"`
	Author string `json:"author"`
	Action string `json:"action"`
}

func readScheduledTasks() ([]StartupEntry, error) {
	out, err := runPowerShell(`try {
  $rows = @()
  foreach ($t in (Get-ScheduledTask -ErrorAction Stop)) {
    $triggers = @($t.Triggers | Where-Object { $_.CimClass.CimClassName -match 'MSFT_TaskLogonTrigger|MSFT_TaskBootTrigger' })
    if ($triggers.Count -eq 0) { continue }
    $action = @($t.Actions | ForEach-Object { ("$($_.Execute) $($_.Arguments)").Trim() }) -join '; '
    $rows += [pscustomobject]@{name=[string]$t.TaskName; path=[string]$t.TaskPath; state=[string]$t.State; author=[string]$t.Author; action=$action}
  }
  ConvertTo-Json -InputObject $rows -Compress -Depth 4
} catch { '[]' }`, 20*time.Second)
	if err != nil {
		return nil, fmt.Errorf("заплановані задачі: %w", err)
	}
	var tasks []psTask
	if err := decodeJSONArray(out, &tasks); err != nil {
		return nil, fmt.Errorf("заплановані задачі: %w", err)
	}
	var entries []StartupEntry
	seen := make(map[string]bool)
	for _, task := range tasks {
		name := strings.TrimSpace(task.Name)
		if name == "" {
			continue
		}
		path := task.Path
		if path == "" {
			path = `\`
		}
		key := strings.ToLower(path + name)
		if seen[key] {
			continue
		}
		seen[key] = true
		state := strings.TrimSpace(task.State)
		enabled := !strings.EqualFold(state, "Disabled")
		location := path
		if !strings.HasSuffix(location, `\`) {
			location += `\`
		}
		location += name
		entries = append(entries, StartupEntry{
			ID:        startupID("task", path, name),
			Name:      name,
			Command:   strings.TrimSpace(task.Action),
			Location:  location,
			Source:    "task",
			Scope:     "system",
			Enabled:   enabled,
			CanToggle: true,
			State:     state,
		})
	}
	if len(entries) > 250 {
		entries = entries[:250]
	}
	return entries, nil
}

func (a *App) SetStartupEnabled(id string, enabled bool) error {
	kind, parts, err := parseStartupID(id)
	if err != nil {
		return err
	}
	switch kind {
	case "reg":
		if len(parts) != 5 {
			return errors.New("некоректний запис автозапуску")
		}
		rootName, _, approvedPath, name, _ := parts[0], parts[1], parts[2], parts[3], parts[4]
		if approvedPath == "" {
			return errors.New("цей запис RunOnce не можна вимкнути без видалення")
		}
		root := registry.CURRENT_USER
		if rootName == "HKLM" {
			root = registry.LOCAL_MACHINE
		}
		if root == registry.LOCAL_MACHINE && !isElevated() {
			return setStartupApprovedElevated(approvedPath, name, enabled)
		}
		return writeStartupApproved(root, approvedPath, name, enabled)
	case "folder":
		if len(parts) != 2 {
			return errors.New("некоректний запис автозапуску")
		}
		scope, filePath := parts[0], parts[1]
		const approved = `Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder`
		name := filepath.Base(filePath)
		if scope == "system" {
			if !isElevated() {
				return setStartupApprovedElevated(approved, name, enabled)
			}
			return writeStartupApproved(registry.LOCAL_MACHINE, approved, name, enabled)
		}
		return writeStartupApproved(registry.CURRENT_USER, approved, name, enabled)
	case "task":
		if len(parts) != 2 {
			return errors.New("некоректна задача автозапуску")
		}
		path, name := parts[0], parts[1]
		action := "Disable-ScheduledTask"
		if enabled {
			action = "Enable-ScheduledTask"
		}
		script := fmt.Sprintf(`$ErrorActionPreference = 'Stop'
$t = Get-ScheduledTask -TaskName '%s' -TaskPath '%s' -ErrorAction Stop
%s -InputObject $t | Out-Null
`, psQuote(name), psQuote(path), action)
		return runElevatedPowerShell("startup-task", script, 60*time.Second)
	default:
		return errors.New("невідоме джерело автозапуску")
	}
}

func writeStartupApproved(root registry.Key, path, name string, enabled bool) error {
	key, _, err := registry.CreateKey(root, path, registry.QUERY_VALUE|registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer key.Close()
	data := make([]byte, 12)
	if existing, _, err := key.GetBinaryValue(name); err == nil && len(existing) >= 12 {
		data = append([]byte(nil), existing...)
	}
	if enabled {
		data[0] = 2
	} else {
		data[0] = 3
	}
	return key.SetBinaryValue(name, data)
}

func setStartupApprovedElevated(approvedPath, name string, enabled bool) error {
	value := 2
	if !enabled {
		value = 3
	}
	bytes := fmt.Sprintf("[byte[]]@(%d,0,0,0,0,0,0,0,0,0,0,0)", value)
	script := fmt.Sprintf(`$ErrorActionPreference = 'Stop'
$key = 'HKLM:\%s'
if (-not (Test-Path -LiteralPath $key)) { New-Item -Path $key -Force | Out-Null }
New-ItemProperty -LiteralPath $key -Name '%s' -Value %s -PropertyType Binary -Force | Out-Null
`, psQuote(approvedPath), psQuote(name), bytes)
	return runElevatedPowerShell("startup-registry", script, 60*time.Second)
}
