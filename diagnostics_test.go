package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestParseBatteryReport(t *testing.T) {
	xml := `<?xml version="1.0" encoding="UTF-8"?>
<BatteryReport xmlns="http://schemas.microsoft.com/Windows/2005/07/BatteryReport">
  <Batteries>
    <Battery>
      <Id>TEST-1</Id>
      <ManufactureName>Example Cells</ManufactureName>
      <SerialNumber>SN123</SerialNumber>
      <Chemistry>Li-I</Chemistry>
      <DesignCapacity>50000</DesignCapacity>
      <FullChargeCapacity>42500</FullChargeCapacity>
      <CycleCount>321</CycleCount>
    </Battery>
  </Batteries>
</BatteryReport>`
	health, err := parseBatteryReport([]byte(xml))
	if err != nil {
		t.Fatalf("parseBatteryReport: %v", err)
	}
	if !health.Present {
		t.Fatal("battery should be present")
	}
	if health.DesignMah != 50000 || health.FullMah != 42500 {
		t.Fatalf("unexpected capacities: %+v", health)
	}
	if health.Cycles == nil || *health.Cycles != 321 {
		t.Fatalf("unexpected cycles: %+v", health.Cycles)
	}
	if health.HealthPct != 85 {
		t.Fatalf("health = %d, want 85", health.HealthPct)
	}
	if health.Chemistry != "Li-I" || health.Manufacturer != "Example Cells" {
		t.Fatalf("unexpected metadata: %+v", health)
	}
}

func TestParseBatteryReportEmpty(t *testing.T) {
	if _, err := parseBatteryReport([]byte(`<BatteryReport><Batteries></Batteries></BatteryReport>`)); err == nil {
		t.Fatal("expected an error for a machine without a battery")
	}
}

func TestParseWingetSearch(t *testing.T) {
	row := func(name, id, version, match string) string {
		return fmt.Sprintf("%-18s %-21s %-7s %-15s %s", name, id, version, match, "winget")
	}
	output := strings.Join([]string{
		fmt.Sprintf("%-18s %-21s %-7s %-15s %s", "Name", "Id", "Version", "Match", "Source"),
		strings.Repeat("-", 80),
		row("VLC media player", "VideoLAN.VLC", "3.0.24", "Moniker: vlc"),
		row("7-Zip", "7zip.7zip", "24.09", ""),
		"<additional entries truncated due to result limit>",
		"",
	}, "\n")
	results := parseWingetSearch(output)
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2: %+v", len(results), results)
	}
	if results[0].ID != "VideoLAN.VLC" || results[0].Name != "VLC media player" {
		t.Fatalf("unexpected first row: %+v", results[0])
	}
	if results[0].Version != "3.0.24" || results[0].Match != "Moniker: vlc" {
		t.Fatalf("unexpected columns: %+v", results[0])
	}
	if results[1].ID != "7zip.7zip" || results[1].Version != "24.09" {
		t.Fatalf("unexpected second row: %+v", results[1])
	}
}

func TestParseWingetSearchCyrillic(t *testing.T) {
	row := func(name, id, version, match string) string {
		return fmt.Sprintf("%-18s %-21s %-7s %-15s %s", name, id, version, match, "winget")
	}
	output := strings.Join([]string{
		fmt.Sprintf("%-18s %-21s %-7s %-15s %s", "Name", "Id", "Version", "Match", "Source"),
		strings.Repeat("-", 80),
		row("Медіаплеєр VLC", "VideoLAN.VLC", "3.0.24", "Moniker: vlc"),
		"",
	}, "\n")
	results := parseWingetSearch(output)
	if len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
	if results[0].Name != "Медіаплеєр VLC" || results[0].ID != "VideoLAN.VLC" {
		t.Fatalf("unexpected row: %+v", results[0])
	}
}

func TestParseWingetSearchWithoutSourceColumn(t *testing.T) {
	header := fmt.Sprintf("%-18s %-24s %-7s %s", "Name", "Id", "Version", "Match")
	row := fmt.Sprintf("%-18s %-24s %-7s %s", "VLC media player", "VideoLAN.VLC", "3.0.24", "Moniker: vlc")
	results := parseWingetSearch(header + "\n" + strings.Repeat("-", 70) + "\n" + row + "\n")
	if len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
	if results[0].Version != "3.0.24" || results[0].Match != "Moniker: vlc" || results[0].Source != "" {
		t.Fatalf("unexpected row: %+v", results[0])
	}
}

func TestCleanDiskRejectsUserFolders(t *testing.T) {
	app := &App{}
	if _, err := app.CleanDisk([]string{"downloads"}); err == nil {
		t.Fatal("Downloads must never be cleaned by this API")
	}
	if _, err := app.CleanDisk([]string{"does-not-exist"}); err == nil {
		t.Fatal("unknown target must be rejected")
	}
	if _, err := app.CleanDisk(nil); err == nil {
		t.Fatal("empty selection must be rejected")
	}
}

func TestDiskTargetsAreUnique(t *testing.T) {
	seen := map[string]bool{}
	safe := 0
	for _, target := range diskTargets() {
		if seen[target.ID] {
			t.Fatalf("duplicate disk target id %q", target.ID)
		}
		seen[target.ID] = true
		if target.Safe {
			safe++
		}
	}
	if safe == 0 {
		t.Fatal("expected at least one cleanable target")
	}
}

func TestScanTreeCountsAndChildren(t *testing.T) {
	root := t.TempDir()
	for path, size := range map[string]int{
		root + `\alpha\one.bin`: 2048,
		root + `\beta\two.bin`:  1024,
	} {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, make([]byte, size), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	scan := scanTree(root, time.Now().Add(time.Minute), 1000)
	if scan.truncated {
		t.Fatal("unexpected truncation")
	}
	if scan.bytes != 3072 || scan.files != 2 {
		t.Fatalf("bytes=%d files=%d, want 3072/2", scan.bytes, scan.files)
	}
	if scan.children["alpha"] == nil || scan.children["alpha"].bytes != 2048 {
		t.Fatalf("alpha child not aggregated: %+v", scan.children)
	}
	if !scan.children["alpha"].dir {
		t.Fatal("alpha should be marked as a directory")
	}
}
