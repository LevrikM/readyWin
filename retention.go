package main

import (
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"time"
)

const (
	runsKeep     = 20
	runsMaxAge   = 14 * 24 * time.Hour
	runsMaxBytes = 200 << 20
	elevatedAge  = 7 * 24 * time.Hour
)

// cleanupStorage removes old ReadyWin run folders. Installation logs are
// useful for diagnostics, but keeping every run forever slowly fills the
// system drive. Newest runs, recent runs and up to 200 MB are always kept.
func cleanupStorage() {
	cleanupRunDirs()
	cleanupElevatedDirs()
}

type storageEntry struct {
	path    string
	modTime time.Time
	size    int64
}

func cleanupRunDirs() {
	dir, err := dataDir()
	if err != nil {
		return
	}
	base := filepath.Join(dir, "runs")
	entries, err := os.ReadDir(base)
	if err != nil {
		return
	}
	items := make([]storageEntry, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		path := filepath.Join(base, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}
		items = append(items, storageEntry{path: path, modTime: info.ModTime(), size: directorySize(path)})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].modTime.After(items[j].modTime) })
	now := time.Now()
	var total int64
	for index, item := range items {
		// Always keep the newest run, even if it alone exceeds the size budget.
		if index == 0 {
			total += item.size
			continue
		}
		tooMany := index >= runsKeep
		tooOld := now.Sub(item.modTime) > runsMaxAge
		tooBig := total+item.size > runsMaxBytes
		if tooMany || tooOld || tooBig {
			_ = os.RemoveAll(item.path)
			continue
		}
		total += item.size
	}
}

func cleanupElevatedDirs() {
	dir, err := dataDir()
	if err != nil {
		return
	}
	base := filepath.Join(dir, "elevated")
	entries, err := os.ReadDir(base)
	if err != nil {
		return
	}
	now := time.Now()
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil || !entry.IsDir() {
			continue
		}
		if now.Sub(info.ModTime()) > elevatedAge {
			_ = os.RemoveAll(filepath.Join(base, entry.Name()))
		}
	}
}

func directorySize(root string) int64 {
	var total int64
	_ = filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if entry.Type()&fs.ModeSymlink != 0 {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			return nil
		}
		if info, err := entry.Info(); err == nil {
			total += info.Size()
		}
		return nil
	})
	return total
}
