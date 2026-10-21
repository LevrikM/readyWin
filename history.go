package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type HistoryItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	ExitCode int    `json:"exitCode,omitempty"`
	Message  string `json:"message,omitempty"`
}

type HistoryEntry struct {
	ID          string        `json:"id"`
	StartedAt   string        `json:"startedAt"`
	FinishedAt  string        `json:"finishedAt"`
	DurationSec int           `json:"durationSec"`
	Status      string        `json:"status"`
	Message     string        `json:"message"`
	Code        string        `json:"code,omitempty"`
	Items       []HistoryItem `json:"items"`
	Before      int           `json:"before"`
	After       int           `json:"after"`
	NewApps     []string      `json:"newApps"`
}

func dataDir() (string, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "ReadyWin")
	// Carry over the data folder from the previous name, once.
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if old := filepath.Join(base, "FirstWin"); stat(old) {
			_ = os.Rename(old, dir)
		}
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func stat(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func historyPath() (string, error) {
	dir, err := dataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "history.json"), nil
}

func readHistory() ([]HistoryEntry, error) {
	path, err := historyPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []HistoryEntry{}, nil
	}
	if err != nil {
		return nil, err
	}
	var entries []HistoryEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return []HistoryEntry{}, nil
	}
	if entries == nil {
		entries = []HistoryEntry{}
	}
	return entries, nil
}

func (a *App) GetHistory() ([]HistoryEntry, error) {
	return readHistory()
}

func (a *App) ClearHistory() error {
	path, err := historyPath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte("[]\n"), 0o644)
}

func saveHistory(entry HistoryEntry) error {
	entries, err := readHistory()
	if err != nil {
		return err
	}
	entries = append([]HistoryEntry{entry}, entries...)
	if len(entries) > 50 {
		entries = entries[:50]
	}
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	path, err := historyPath()
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, append(data, '\n'), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func historyFromState(state InstallState) HistoryEntry {
	started, _ := time.Parse(time.RFC3339, state.StartedAt)
	finished, _ := time.Parse(time.RFC3339, state.FinishedAt)
	duration := int(finished.Sub(started).Seconds())
	if duration < 0 {
		duration = 0
	}
	status := "success"
	if state.Cancelled {
		status = "cancelled"
	} else {
		for _, item := range state.Items {
			if item.Status == "failed" {
				status = "failed"
				break
			}
		}
		if status == "success" && !state.Success {
			status = "failed"
		}
	}
	items := make([]HistoryItem, 0, len(state.Items))
	for _, item := range state.Items {
		items = append(items, HistoryItem{
			ID: item.ID, Name: item.Name, Status: item.Status, ExitCode: item.ExitCode, Message: item.Message,
		})
	}
	newApps := make([]string, 0, len(state.Added))
	for _, change := range state.Added {
		newApps = append(newApps, change.Name)
	}
	after := state.BaselineCount - len(state.Removed) + len(state.Added)
	if after < 0 {
		after = 0
	}
	return HistoryEntry{
		ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
		StartedAt:   state.StartedAt,
		FinishedAt:  state.FinishedAt,
		DurationSec: duration,
		Status:      status,
		Message:     state.Message,
		Code:        state.Code,
		Items:       items,
		Before:      state.BaselineCount,
		After:       after,
		NewApps:     newApps,
	}
}
