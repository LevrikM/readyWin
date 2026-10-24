package main

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type DiskChild struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	Dir   bool   `json:"dir"`
	Bytes int64  `json:"bytes"`
}

type DiskUsageEntry struct {
	ID        string      `json:"id"`
	Label     string      `json:"label"`
	Path      string      `json:"path"`
	Safe      bool        `json:"safe"`
	Exists    bool        `json:"exists"`
	Bytes     int64       `json:"bytes"`
	Files     int         `json:"files"`
	Children  []DiskChild `json:"children,omitempty"`
	Truncated bool        `json:"truncated,omitempty"`
	Error     string      `json:"error,omitempty"`
}

type DiskUsageReport struct {
	CheckedAt  string           `json:"checkedAt"`
	DiskTotal  float64          `json:"diskTotalGb"`
	DiskFree   float64          `json:"diskFreeGb"`
	Entries    []DiskUsageEntry `json:"entries"`
	ScanMillis int              `json:"scanMs"`
	Error      string           `json:"error,omitempty"`
}

type DiskCleanResult struct {
	FreedBytes int64    `json:"freedBytes"`
	Removed    int      `json:"removed"`
	Failed     int      `json:"failed"`
	NeedsAdmin bool     `json:"needsAdmin"`
	Errors     []string `json:"errors,omitempty"`
}

const (
	diskUsageCacheTTL = 2 * time.Minute
	diskScanBudget    = 7 * time.Second
	diskScanMaxFiles  = 200000
	diskChildLimit    = 6
)

var (
	diskUsageMu    sync.Mutex
	diskUsageCache DiskUsageReport
	diskUsageAt    time.Time
)

type diskTarget struct {
	ID    string
	Label string
	Path  string
	Safe  bool
}

func diskTargets() []diskTarget {
	var targets []diskTarget
	add := func(id, label, path string, safe bool) {
		if strings.TrimSpace(path) == "" {
			return
		}
		targets = append(targets, diskTarget{ID: id, Label: label, Path: path, Safe: safe})
	}

	add("userTemp", "Temporary files", os.TempDir(), true)
	if root := os.Getenv("SystemRoot"); root != "" {
		add("windowsTemp", "Windows temp", filepath.Join(root, "Temp"), true)
		add("windowsUpdate", "Windows Update cache", filepath.Join(root, "SoftwareDistribution", "Download"), true)
		add("deliveryOptimization", "Delivery Optimization cache", filepath.Join(root, "ServiceProfiles", "NetworkService", "AppData", "Local", "Microsoft", "Windows", "DeliveryOptimization", "Cache"), true)
	}
	if local := os.Getenv("LOCALAPPDATA"); local != "" {
		add("crashDumps", "Crash dumps", filepath.Join(local, "CrashDumps"), true)
		add("thumbnails", "Thumbnail cache", filepath.Join(local, "Microsoft", "Windows", "Explorer"), true)
	}
	if home, err := os.UserHomeDir(); err == nil {
		add("downloads", "Downloads", filepath.Join(home, "Downloads"), false)
		add("desktop", "Desktop", filepath.Join(home, "Desktop"), false)
		add("documents", "Documents", filepath.Join(home, "Documents"), false)
		add("videos", "Videos", filepath.Join(home, "Videos"), false)
		add("pictures", "Pictures", filepath.Join(home, "Pictures"), false)
	}
	return targets
}

func (a *App) GetDiskUsage(force bool) DiskUsageReport {
	diskUsageMu.Lock()
	defer diskUsageMu.Unlock()
	if !force && !diskUsageAt.IsZero() && time.Since(diskUsageAt) < diskUsageCacheTTL {
		return diskUsageCache
	}
	report := scanDiskUsage()
	diskUsageCache = report
	diskUsageAt = time.Now()
	return report
}

func scanDiskUsage() DiskUsageReport {
	started := time.Now()
	report := DiskUsageReport{
		CheckedAt: started.Format(time.RFC3339),
		Entries:   []DiskUsageEntry{},
	}
	if drive := os.Getenv("SystemDrive"); drive != "" {
		if total, free := diskSpace(drive + `\`); total > 0 {
			report.DiskTotal = float64(total) / (1 << 30)
			report.DiskFree = float64(free) / (1 << 30)
		}
	}

	targets := diskTargets()
	entries := make([]DiskUsageEntry, len(targets))
	sem := make(chan struct{}, 4)
	var wg sync.WaitGroup
	for index, target := range targets {
		wg.Add(1)
		go func(index int, target diskTarget) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			entries[index] = scanDiskTarget(target)
		}(index, target)
	}
	wg.Wait()
	report.Entries = entries
	report.ScanMillis = int(time.Since(started).Milliseconds())
	return report
}

func scanDiskTarget(target diskTarget) DiskUsageEntry {
	entry := DiskUsageEntry{ID: target.ID, Label: target.Label, Path: target.Path, Safe: target.Safe}
	info, err := os.Stat(target.Path)
	if err != nil || !info.IsDir() {
		return entry
	}
	entry.Exists = true
	scan := scanTree(target.Path, time.Now().Add(diskScanBudget), diskScanMaxFiles)
	entry.Bytes = scan.bytes
	entry.Files = scan.files
	entry.Truncated = scan.truncated

	children := make([]DiskChild, 0, len(scan.children))
	for name, child := range scan.children {
		children = append(children, DiskChild{
			Name:  name,
			Path:  child.path,
			Dir:   child.dir,
			Bytes: child.bytes,
		})
	}
	sort.Slice(children, func(i, j int) bool { return children[i].Bytes > children[j].Bytes })
	if len(children) > diskChildLimit {
		children = children[:diskChildLimit]
	}
	if len(children) > 0 {
		entry.Children = children
	}
	return entry
}

type childAggregate struct {
	bytes int64
	path  string
	dir   bool
}

type treeScan struct {
	bytes     int64
	files     int
	truncated bool
	children  map[string]*childAggregate
}

func scanTree(root string, deadline time.Time, maxEntries int) treeScan {
	scan := treeScan{children: map[string]*childAggregate{}}
	entries := 0
	_ = filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			if entry != nil && entry.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if path == root {
			return nil
		}
		entries++
		if entries > maxEntries {
			scan.truncated = true
			return fs.SkipAll
		}
		if entries%512 == 0 && time.Now().After(deadline) {
			scan.truncated = true
			return fs.SkipAll
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		top := strings.SplitN(rel, string(os.PathSeparator), 2)[0]
		child, ok := scan.children[top]
		if !ok {
			child = &childAggregate{path: filepath.Join(root, top), dir: entry.IsDir()}
			scan.children[top] = child
		}
		info, err := entry.Info()
		if err != nil {
			return nil
		}
		if info.IsDir() {
			child.dir = true
			return nil
		}
		if info.Mode().IsRegular() {
			scan.bytes += info.Size()
			scan.files++
			child.bytes += info.Size()
		}
		return nil
	})
	return scan
}

// CleanDisk removes the contents of whitelisted cache folders. Anything the user
// may have created on purpose (Downloads, Desktop, Documents) is report-only and
// rejected here even if a client asks for it.
func (a *App) CleanDisk(ids []string) (DiskCleanResult, error) {
	result := DiskCleanResult{}
	allowed := map[string]diskTarget{}
	for _, target := range diskTargets() {
		if target.Safe {
			allowed[target.ID] = target
		}
	}

	var selected []diskTarget
	seen := map[string]bool{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}
		target, ok := allowed[id]
		if !ok {
			return result, errors.New("цю теку не можна очищати: " + id)
		}
		seen[id] = true
		selected = append(selected, target)
	}
	if len(selected) == 0 {
		return result, errors.New("нічого не вибрано")
	}

	sizes := map[string]int64{}
	diskUsageMu.Lock()
	cached := diskUsageCache
	cachedAt := diskUsageAt
	diskUsageMu.Unlock()
	if !cachedAt.IsZero() && time.Since(cachedAt) < diskUsageCacheTTL {
		for _, entry := range cached.Entries {
			sizes[entry.ID] = entry.Bytes
		}
	}

	for _, target := range selected {
		items, err := os.ReadDir(target.Path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			result.Failed++
			if os.IsPermission(err) {
				result.NeedsAdmin = true
			}
			if len(result.Errors) < 3 {
				result.Errors = append(result.Errors, target.Label+": "+err.Error())
			}
			continue
		}
		result.FreedBytes += sizes[target.ID]
		for _, item := range items {
			path := filepath.Join(target.Path, item.Name())
			if err := os.RemoveAll(path); err != nil {
				result.Failed++
				if os.IsPermission(err) {
					result.NeedsAdmin = true
				}
				if len(result.Errors) < 3 {
					result.Errors = append(result.Errors, item.Name()+": "+err.Error())
				}
				continue
			}
			result.Removed++
		}
	}

	diskUsageMu.Lock()
	diskUsageAt = time.Time{}
	diskUsageMu.Unlock()
	return result, nil
}
