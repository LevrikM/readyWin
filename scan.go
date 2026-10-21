package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unicode"
	"unsafe"

	"golang.org/x/sys/windows/registry"
)

type InstalledApp struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Version   string `json:"version"`
	Publisher string `json:"publisher"`
	Source    string `json:"source"`
	Location  string `json:"location,omitempty"`
}

type SystemCheck struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Detail string `json:"detail"`
	Status string `json:"status"`
	Kind   string `json:"kind"`
}

type SystemInfo struct {
	OSName      string   `json:"osName"`
	Edition     string   `json:"edition"`
	Version     string   `json:"version"`
	Build       string   `json:"build"`
	Arch        string   `json:"arch"`
	Hostname    string   `json:"hostname"`
	Username    string   `json:"username"`
	CPU         string   `json:"cpu"`
	Cores       int      `json:"cores"`
	GPU         []string `json:"gpu"`
	RAMTotalGB  float64  `json:"ramTotalGb"`
	RAMFreeGB   float64  `json:"ramFreeGb"`
	DiskTotalGB float64  `json:"diskTotalGb"`
	DiskFreeGB  float64  `json:"diskFreeGb"`
	DiskLetter  string   `json:"diskLetter"`
	Elevated    bool     `json:"elevated"`
	SecureBoot  string   `json:"secureBoot"`
	Defender    string   `json:"defender"`
	WebView2    string   `json:"webView2"`
	Winget      string   `json:"winget"`
}

type ScanResult struct {
	ScannedAt  string                  `json:"scannedAt"`
	DurationMs int64                   `json:"durationMs"`
	Installed  map[string]InstalledApp `json:"installed"`
	System     SystemInfo              `json:"system"`
	Checks     []SystemCheck           `json:"checks"`
}

type rawApp struct {
	Name      string
	Version   string
	Publisher string
	Location  string
}

type uninstallRoot struct {
	root registry.Key
	path string
}

var uninstallRoots = []uninstallRoot{
	{registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`},
	{registry.LOCAL_MACHINE, `SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`},
	{registry.CURRENT_USER, `SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`},
}

func (a *App) detectInstalled(cat Catalog) map[string]InstalledApp {
	installed := make(map[string]InstalledApp)
	scores := make(map[string]int)

	for _, app := range scanRegistryApps() {
		id, score := bestCatalogMatch(app.Name, cat.Items)
		if id == "" {
			continue
		}
		current, exists := installed[id]
		if !exists || score > scores[id] || (score == scores[id] && app.Version > current.Version) {
			installed[id] = InstalledApp{
				ID:        id,
				Name:      app.Name,
				Version:   app.Version,
				Publisher: app.Publisher,
				Source:    "registry",
				Location:  app.Location,
			}
			scores[id] = score
		}
	}

	for id, app := range scanStorePackages(cat) {
		existing, ok := installed[id]
		if !ok {
			installed[id] = app
			continue
		}
		if existing.Version == "" && app.Version != "" {
			installed[id] = app
		}
	}

	for id, app := range detectRuntimes() {
		installed[id] = app
	}

	for id, app := range installed {
		if item, ok := catalogItem(cat.Items, id); ok {
			app.ID = id
			app.Name = item.Name
			if app.Publisher == "" {
				app.Publisher = item.Publisher
			}
			installed[id] = app
		}
	}

	return installed
}

func (a *App) Scan() (ScanResult, error) {
	cat, err := loadCatalog()
	if err != nil {
		return ScanResult{}, err
	}

	started := time.Now()
	installed := a.detectInstalled(cat)

	system := collectSystemInfo()
	checks := buildChecks(installed, system, cat)

	system.Winget = installedWingetVersion()
	system.WebView2 = webViewVersion()
	for i := range checks {
		if checks[i].ID == "winget" {
			if system.Winget == "" {
				checks[i].Status = "missing"
				checks[i].Detail = "Не знайдено в PATH"
			} else {
				checks[i].Status = "ok"
				checks[i].Detail = "winget " + system.Winget
			}
		}
	}

	return ScanResult{
		ScannedAt:  time.Now().Format(time.RFC3339),
		DurationMs: time.Since(started).Milliseconds(),
		Installed:  installed,
		System:     system,
		Checks:     checks,
	}, nil
}

func catalogItem(items []Item, id string) (Item, bool) {
	for _, item := range items {
		if item.ID == id {
			return item, true
		}
	}
	return Item{}, false
}

func scanRegistryApps() []rawApp {
	seen := make(map[string]bool)
	var result []rawApp

	for _, root := range uninstallRoots {
		key, err := registry.OpenKey(root.root, root.path, registry.READ)
		if err != nil {
			continue
		}
		names, err := key.ReadSubKeyNames(-1)
		if err != nil {
			key.Close()
			continue
		}
		for _, name := range names {
			sub, err := registry.OpenKey(key, name, registry.READ)
			if err != nil {
				continue
			}
			displayName, _, _ := sub.GetStringValue("DisplayName")
			displayName = strings.TrimSpace(displayName)
			if displayName == "" || skipRegistryEntry(sub, displayName) {
				sub.Close()
				continue
			}
			version, _, _ := sub.GetStringValue("DisplayVersion")
			publisher, _, _ := sub.GetStringValue("Publisher")
			location, _, _ := sub.GetStringValue("InstallLocation")
			keyID := strings.ToLower(displayName) + "|" + strings.ToLower(version)
			if !seen[keyID] {
				seen[keyID] = true
				result = append(result, rawApp{
					Name:      displayName,
					Version:   strings.TrimSpace(version),
					Publisher: strings.TrimSpace(publisher),
					Location:  strings.TrimSpace(location),
				})
			}
			sub.Close()
		}
		key.Close()
	}
	return result
}

func skipRegistryEntry(key registry.Key, name string) bool {
	if value, _, err := key.GetIntegerValue("SystemComponent"); err == nil && value == 1 {
		return true
	}
	if parent, _, err := key.GetStringValue("ParentKeyName"); err == nil && strings.TrimSpace(parent) != "" {
		return true
	}
	if release, _, err := key.GetStringValue("ReleaseType"); err == nil {
		release = strings.ToLower(release)
		if strings.Contains(release, "update") || strings.Contains(release, "hotfix") {
			return true
		}
	}
	lower := strings.ToLower(name)
	for _, prefix := range []string{
		"update for ", "security update", "hotfix for ", "kb", "microsoft visual c++ 2015-2022 redistributable (x64) - (",
	} {
		if strings.HasPrefix(lower, prefix) {
			return true
		}
	}
	return false
}

const storeRepoPath = `Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages`

func scanStorePackages(cat Catalog) map[string]InstalledApp {
	result := make(map[string]InstalledApp)
	key, err := registry.OpenKey(registry.CURRENT_USER, storeRepoPath, registry.READ)
	if err != nil {
		return result
	}
	defer key.Close()

	names, err := key.ReadSubKeyNames(-1)
	if err != nil {
		return result
	}
	for _, name := range names {
		identity, version := splitPackageID(name)
		if identity == "" || version == "" {
			continue
		}
		sub, err := registry.OpenKey(key, name, registry.READ)
		if err != nil {
			continue
		}
		display, _, _ := sub.GetStringValue("DisplayName")
		root, _, _ := sub.GetStringValue("PackageRootFolder")
		sub.Close()

		display = strings.TrimSpace(display)
		if display == "" || strings.HasPrefix(strings.ToLower(display), "ms-resource") {
			continue
		}
		if root != "" {
			if _, err := os.Stat(root); err != nil {
				continue
			}
		}
		id, _ := bestStoreMatch(display, identity, cat.Items)
		if id == "" {
			continue
		}
		if existing, ok := result[id]; ok && existing.Version != "" {
			continue
		}
		result[id] = InstalledApp{
			ID:       id,
			Name:     display,
			Version:  version,
			Source:   "store",
			Location: root,
		}
	}
	return result
}

func splitPackageID(packageID string) (string, string) {
	parts := strings.Split(packageID, "_")
	if len(parts) < 2 {
		return "", ""
	}
	identity := strings.TrimSpace(parts[0])
	version := strings.TrimSpace(parts[1])
	if identity == "" || !looksLikeVersion(version) {
		return "", ""
	}
	if len(identity) == 36 && strings.Count(identity, "-") == 4 {
		// A raw GUID is a framework or driver package, not an app.
		return "", ""
	}
	return identity, version
}

func looksLikeVersion(value string) bool {
	parts := strings.Split(value, ".")
	if len(parts) < 2 {
		return false
	}
	for _, part := range parts {
		if part == "" {
			return false
		}
		if _, err := strconv.Atoi(part); err != nil {
			return false
		}
	}
	return true
}

func bestStoreMatch(displayName, identity string, items []Item) (string, int) {
	display := normalizeName(displayName)
	full := normalizeName(identity)
	suffix := full
	if idx := strings.LastIndex(identity, "."); idx >= 0 {
		suffix = normalizeName(identity[idx+1:])
	}
	if display == "" && suffix == "" {
		return "", 0
	}

	bestID, bestScore := "", 0
	for _, item := range items {
		aliases := append([]string{}, item.Match...)
		aliases = append(aliases, item.Name, item.ShortName)
		for _, alias := range aliases {
			needle := normalizeName(alias)
			if len(needle) < 3 {
				continue
			}
			score := 0
			switch {
			case display != "" && display == needle:
				score = 1000 + len(needle)
			case suffix == needle:
				score = 950 + len(needle)
			case full == needle:
				score = 900 + len(needle)
			case display != "" && strings.HasPrefix(display, needle+" "):
				score = 700 + len(needle)
			case display != "" && strings.Contains(" "+display+" ", " "+needle+" "):
				score = 600 + len(needle)
			case len(needle) >= 6 && strings.Contains(full, needle):
				score = 400 + len(needle)
			}
			if score > bestScore {
				bestScore = score
				bestID = item.ID
			}
		}
	}
	if bestScore > 0 && bestScore < 404 {
		return "", 0
	}
	return bestID, bestScore
}

func normalizeName(value string) string {
	value = strings.ToLower(value)
	var b strings.Builder
	space := true
	for _, r := range value {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			space = false
		} else if !space {
			b.WriteByte(' ')
			space = true
		}
	}
	return strings.TrimSpace(b.String())
}

func bestCatalogMatch(displayName string, items []Item) (string, int) {
	haystack := normalizeName(displayName)
	if haystack == "" {
		return "", 0
	}
	bestID := ""
	bestScore := 0
	for _, item := range items {
		aliases := append([]string{}, item.Match...)
		aliases = append(aliases, item.Name, item.ShortName)
		for _, alias := range aliases {
			needle := normalizeName(alias)
			if needle == "" {
				continue
			}
			score := 0
			switch {
			case haystack == needle:
				score = 1000 + len(needle)
			case strings.HasPrefix(haystack, needle+" "):
				score = 700 + len(needle)
			case strings.Contains(" "+haystack+" ", " "+needle+" "):
				score = 500 + len(needle)
			}
			if score > bestScore {
				bestScore = score
				bestID = item.ID
			}
		}
	}
	// Short, generic aliases are too risky unless they are a full word at the start.
	if bestScore > 0 && bestScore < 504 {
		return "", 0
	}
	return bestID, bestScore
}

func detectRuntimes() map[string]InstalledApp {
	result := make(map[string]InstalledApp)
	systemRoot := os.Getenv("SystemRoot")
	programFiles := os.Getenv("ProgramFiles")
	localAppData := os.Getenv("LOCALAPPDATA")

	if systemRoot != "" {
		if _, err := os.Stat(filepath.Join(systemRoot, "System32", "d3dx9_43.dll")); err == nil {
			result["Microsoft.DirectX"] = InstalledApp{
				ID: "Microsoft.DirectX", Name: "DirectX End-User Runtime", Publisher: "Microsoft",
				Version: "9.29", Source: "runtime",
			}
		}
	}

	vcVersion := func(view string) (string, bool) {
		paths := []string{
			`SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\` + view,
			`SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\` + view,
		}
		for _, path := range paths {
			key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.READ)
			if err != nil {
				continue
			}
			installed, _, _ := key.GetIntegerValue("Installed")
			version, _, _ := key.GetStringValue("Version")
			key.Close()
			if installed == 1 || strings.TrimSpace(version) != "" {
				return strings.TrimSpace(version), true
			}
		}
		return "", false
	}
	if version, ok := vcVersion("x64"); ok {
		result["Microsoft.VCRedist.2015+.x64"] = InstalledApp{
			ID: "Microsoft.VCRedist.2015+.x64", Name: "Visual C++ 2015–2022 Redistributable (x64)",
			Publisher: "Microsoft", Version: version, Source: "runtime",
		}
	}
	if version, ok := vcVersion("x86"); ok {
		result["Microsoft.VCRedist.2015+.x86"] = InstalledApp{
			ID: "Microsoft.VCRedist.2015+.x86", Name: "Visual C++ 2015–2022 Redistributable (x86)",
			Publisher: "Microsoft", Version: version, Source: "runtime",
		}
	}

	if programFiles != "" {
		desktopDir := filepath.Join(programFiles, "dotnet", "shared", "Microsoft.WindowsDesktop.App")
		if versions := directoryVersions(desktopDir, "8."); len(versions) > 0 {
			result["Microsoft.DotNet.DesktopRuntime.8"] = InstalledApp{
				ID: "Microsoft.DotNet.DesktopRuntime.8", Name: ".NET Desktop Runtime 8",
				Publisher: "Microsoft", Version: versions[len(versions)-1], Source: "runtime",
			}
		}
	}
	if version := webViewVersion(); version != "" {
		result["Microsoft.EdgeWebView2Runtime"] = InstalledApp{
			ID: "Microsoft.EdgeWebView2Runtime", Name: "Microsoft Edge WebView2 Runtime",
			Publisher: "Microsoft", Version: version, Source: "runtime",
		}
	}
	if localAppData != "" {
		if _, err := os.Stat(filepath.Join(localAppData, "Microsoft", "WindowsApps", "wt.exe")); err == nil {
			result["Microsoft.WindowsTerminal"] = InstalledApp{
				ID: "Microsoft.WindowsTerminal", Name: "Windows Terminal", Publisher: "Microsoft",
				Source: "runtime",
			}
		}
	}
	if programFiles != "" {
		if _, err := os.Stat(filepath.Join(programFiles, "PowerShell", "7", "pwsh.exe")); err == nil {
			result["Microsoft.PowerShell"] = InstalledApp{
				ID: "Microsoft.PowerShell", Name: "PowerShell 7", Publisher: "Microsoft",
				Source: "runtime",
			}
		}
	}

	if key, err := registry.OpenKey(registry.CURRENT_USER, `SOFTWARE\Microsoft\Windows\CurrentVersion\Lxss`, registry.READ); err == nil {
		distro, _, _ := key.GetStringValue("DefaultDistribution")
		defaultVersion, _, _ := key.GetIntegerValue("DefaultVersion")
		key.Close()
		if distro != "" || defaultVersion > 0 {
			version := "WSL 2"
			if defaultVersion == 1 {
				version = "WSL 1"
			}
			result["Microsoft.WSL"] = InstalledApp{
				ID: "Microsoft.WSL", Name: "Windows Subsystem for Linux", Publisher: "Microsoft",
				Version: version, Source: "runtime",
			}
		}
	}

	return result
}

func directoryVersions(dir, prefix string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var versions []string
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasPrefix(entry.Name(), prefix) {
			continue
		}
		versions = append(versions, entry.Name())
	}
	sort.Slice(versions, func(i, j int) bool { return versionLess(versions[i], versions[j]) })
	return versions
}

func versionLess(a, b string) bool {
	as := strings.Split(a, ".")
	bs := strings.Split(b, ".")
	for i := 0; i < len(as) || i < len(bs); i++ {
		var av, bv int
		if i < len(as) {
			av, _ = strconv.Atoi(as[i])
		}
		if i < len(bs) {
			bv, _ = strconv.Atoi(bs[i])
		}
		if av != bv {
			return av < bv
		}
	}
	return a < b
}

func webViewVersion() string {
	base := filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "EdgeWebView", "Application")
	if base == "" {
		return ""
	}
	entries, err := os.ReadDir(base)
	if err != nil {
		return ""
	}
	var candidates []string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		exe := filepath.Join(base, entry.Name(), "msedgewebview2.exe")
		if _, err := os.Stat(exe); err == nil {
			candidates = append(candidates, entry.Name())
		}
	}
	if len(candidates) == 0 {
		return ""
	}
	sort.Slice(candidates, func(i, j int) bool { return versionLess(candidates[i], candidates[j]) })
	return candidates[len(candidates)-1]
}

func installedWingetVersion() string {
	cmd := exec.Command("winget", "--version")
	cmd.SysProcAttr = hiddenProcess()
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func hiddenProcess() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
}

func buildChecks(installed map[string]InstalledApp, system SystemInfo, cat Catalog) []SystemCheck {
	runtimeIDs := []string{
		"Microsoft.DirectX",
		"Microsoft.VCRedist.2015+.x64",
		"Microsoft.VCRedist.2015+.x86",
		"Microsoft.DotNet.DesktopRuntime.8",
		"Microsoft.EdgeWebView2Runtime",
		"Microsoft.WindowsTerminal",
		"Microsoft.PowerShell",
		"Microsoft.WSL",
	}
	labels := map[string]string{
		"Microsoft.DirectX":                 "DirectX 9–11",
		"Microsoft.VCRedist.2015+.x64":      "Visual C++ x64",
		"Microsoft.VCRedist.2015+.x86":      "Visual C++ x86",
		"Microsoft.DotNet.DesktopRuntime.8": ".NET Desktop 8",
		"Microsoft.EdgeWebView2Runtime":     "WebView2",
		"Microsoft.WindowsTerminal":         "Windows Terminal",
		"Microsoft.PowerShell":              "PowerShell 7",
		"Microsoft.WSL":                     "WSL",
	}
	var checks []SystemCheck
	for _, id := range runtimeIDs {
		label := labels[id]
		app, ok := installed[id]
		check := SystemCheck{ID: id, Label: label, Kind: "runtime", Status: "missing"}
		if ok {
			check.Status = "ok"
			check.Detail = "Встановлено"
			if app.Version != "" {
				check.Detail = "Версія " + app.Version
			}
			if app.Source == "runtime" && app.Version == "" {
				check.Detail = "Виявлено в системі"
			}
		} else {
			check.Detail = "Не знайдено"
		}
		checks = append(checks, check)
	}

	winget := system.Winget
	wingetCheck := SystemCheck{ID: "winget", Label: "Менеджер пакетів winget", Kind: "system", Status: "ok"}
	if winget == "" {
		wingetCheck.Status = "missing"
		wingetCheck.Detail = "Не знайдено в PATH"
	} else {
		wingetCheck.Detail = "winget " + winget
	}
	checks = append(checks, wingetCheck)

	secure := SystemCheck{ID: "secureboot", Label: "Безпечне завантаження", Kind: "security", Status: "warn"}
	switch system.SecureBoot {
	case "on":
		secure.Status = "ok"
		secure.Detail = "on"
	case "off":
		secure.Status = "warn"
		secure.Detail = "off"
	default:
		secure.Status = "warn"
		secure.Detail = "unknown"
	}
	checks = append(checks, secure)

	defender := SystemCheck{ID: "defender", Label: "Захисник Windows", Kind: "security", Status: "ok"}
	switch system.Defender {
	case "off":
		defender.Status = "warn"
		defender.Detail = "off"
	case "":
		defender.Status = "warn"
		defender.Detail = "unknown"
	default:
		defender.Detail = "on"
	}
	checks = append(checks, defender)

	disk := SystemCheck{ID: "disk", Label: "Місце на диску", Kind: "system", Status: "ok"}
	disk.Detail = fmt.Sprintf("%.1f ГБ вільно з %.0f ГБ", system.DiskFreeGB, system.DiskTotalGB)
	if system.DiskFreeGB < 20 {
		disk.Status = "warn"
		disk.Detail += " — варто звільнити місце"
	}
	checks = append(checks, disk)

	memory := SystemCheck{ID: "memory", Label: "Оперативна пам'ять", Kind: "system", Status: "ok"}
	memory.Detail = fmt.Sprintf("%.0f ГБ", system.RAMTotalGB)
	if system.RAMTotalGB < 8 {
		memory.Status = "warn"
		memory.Detail += " — мінімум для комфортної роботи"
	}
	checks = append(checks, memory)

	network := SystemCheck{ID: "network", Label: "Доступ до winget", Kind: "system", Status: "ok"}
	conn, err := net.DialTimeout("tcp", "api.winget.microsoft.com:443", 900*time.Millisecond)
	if err != nil {
		network.Status = "warn"
		network.Detail = "Немає відповіді — перевірте мережу"
	} else {
		network.Detail = "З'єднання доступне"
		conn.Close()
	}
	checks = append(checks, network)

	_ = cat
	return checks
}

func collectSystemInfo() SystemInfo {
	info := SystemInfo{
		Arch:       runtime.GOARCH,
		Cores:      runtime.NumCPU(),
		Elevated:   isElevated(),
		WebView2:   webViewVersion(),
		Winget:     installedWingetVersion(),
		SecureBoot: secureBootState(),
		Defender:   defenderState(),
	}
	info.Hostname, _ = os.Hostname()
	info.Username = os.Getenv("USERNAME")

	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, registry.READ); err == nil {
		info.OSName, _, _ = key.GetStringValue("ProductName")
		info.Edition, _, _ = key.GetStringValue("EditionID")
		info.Version, _, _ = key.GetStringValue("DisplayVersion")
		info.Build, _, _ = key.GetStringValue("CurrentBuild")
		ubr, _, _ := key.GetIntegerValue("UBR")
		if info.Build != "" {
			info.Build = fmt.Sprintf("%s.%d", info.Build, ubr)
		}
		key.Close()
	}
	if info.OSName == "" {
		info.OSName = "Windows"
	}
	if buildNumber(info.Build) >= 22000 {
		info.OSName = strings.Replace(info.OSName, "Windows 10", "Windows 11", 1)
	}

	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, `HARDWARE\DESCRIPTION\System\CentralProcessor\0`, registry.READ); err == nil {
		info.CPU, _, _ = key.GetStringValue("ProcessorNameString")
		key.Close()
	}
	info.CPU = strings.Join(strings.Fields(info.CPU), " ")
	if info.CPU == "" {
		info.CPU = runtime.GOARCH
	}

	info.GPU = detectGPUs()
	totalRAM, freeRAM := memoryStatus()
	info.RAMTotalGB = float64(totalRAM) / (1024 * 1024 * 1024)
	info.RAMFreeGB = float64(freeRAM) / (1024 * 1024 * 1024)
	info.DiskLetter = os.Getenv("SystemDrive")
	if info.DiskLetter == "" {
		info.DiskLetter = "C:"
	}
	totalDisk, freeDisk := diskSpace(info.DiskLetter + `\`)
	info.DiskTotalGB = float64(totalDisk) / (1024 * 1024 * 1024)
	info.DiskFreeGB = float64(freeDisk) / (1024 * 1024 * 1024)
	return info
}

func buildNumber(build string) int {
	part := build
	if idx := strings.IndexByte(part, '.'); idx >= 0 {
		part = part[:idx]
	}
	value, _ := strconv.Atoi(part)
	return value
}

func detectGPUs() []string {
	const gpuClass = `SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}`
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, gpuClass, registry.READ)
	if err != nil {
		return nil
	}
	defer key.Close()
	names, _ := key.ReadSubKeyNames(-1)
	seen := make(map[string]bool)
	var result []string
	for _, name := range names {
		sub, err := registry.OpenKey(key, name, registry.READ)
		if err != nil {
			continue
		}
		desc, _, _ := sub.GetStringValue("DriverDesc")
		sub.Close()
		desc = strings.TrimSpace(desc)
		if desc == "" || seen[desc] || isVirtualGPU(desc) {
			continue
		}
		seen[desc] = true
		result = append(result, desc)
	}
	return result
}

func isVirtualGPU(name string) bool {
	lower := strings.ToLower(name)
	for _, marker := range []string{
		"microsoft basic", "remote display", "parsec", "virtualbox", "vmware",
		"hyper-v", "citrix", "virtual display", "meta virtual", "oculus virtual",
	} {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}

type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

func memoryStatus() (uint64, uint64) {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel32.NewProc("GlobalMemoryStatusEx")
	status := memoryStatusEx{Length: uint32(unsafe.Sizeof(memoryStatusEx{}))}
	if ret, _, _ := proc.Call(uintptr(unsafe.Pointer(&status))); ret == 0 {
		return 0, 0
	}
	return status.TotalPhys, status.AvailPhys
}

func diskSpace(path string) (uint64, uint64) {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel32.NewProc("GetDiskFreeSpaceExW")
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, 0
	}
	var freeAvailable, total, totalFree uint64
	ret, _, _ := proc.Call(
		uintptr(unsafe.Pointer(p)),
		uintptr(unsafe.Pointer(&freeAvailable)),
		uintptr(unsafe.Pointer(&total)),
		uintptr(unsafe.Pointer(&totalFree)),
	)
	if ret == 0 {
		return 0, 0
	}
	return total, freeAvailable
}

func isElevated() bool {
	shell32 := syscall.NewLazyDLL("shell32.dll")
	proc := shell32.NewProc("IsUserAnAdmin")
	ret, _, _ := proc.Call()
	return ret != 0
}

func secureBootState() string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Control\SecureBoot\State`, registry.READ)
	if err != nil {
		return ""
	}
	value, _, err := key.GetIntegerValue("UEFISecureBootEnabled")
	key.Close()
	if err != nil {
		return ""
	}
	if value == 1 {
		return "on"
	}
	return "off"
}

func defenderState() string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Services\WinDefend`, registry.READ)
	if err != nil {
		return ""
	}
	start, _, _ := key.GetIntegerValue("Start")
	key.Close()
	if start == 4 {
		return "off"
	}
	return "on"
}
