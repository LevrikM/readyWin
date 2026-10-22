package main

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func testCatalog() Catalog {
	return Catalog{
		Version: "1.0",
		Updated: "2026-10-21",
		Groups:  []Group{{ID: "system", Name: "System", Index: 1}},
		Items: []Item{
			{ID: "Test.App", Name: "Test App", ShortName: "Test", Group: "system", Match: []string{"test"}},
			{ID: "Other.Tool", Name: "Other Tool", ShortName: "Other", Group: "system"},
		},
	}
}

func TestValidateCatalog(t *testing.T) {
	if err := validateCatalog(testCatalog()); err != nil {
		t.Fatalf("valid catalog rejected: %v", err)
	}
	duplicate := testCatalog()
	duplicate.Items[1].ID = duplicate.Items[0].ID
	if err := validateCatalog(duplicate); err == nil {
		t.Fatal("duplicate item ID accepted")
	}
	badGroup := testCatalog()
	badGroup.Items[0].Group = "missing"
	if err := validateCatalog(badGroup); err == nil {
		t.Fatal("unknown group accepted")
	}
	badID := testCatalog()
	badID.Items[0].ID = "bad id!"
	if err := validateCatalog(badID); err == nil {
		t.Fatal("invalid winget ID accepted")
	}
}

func TestVerifyCatalogSignatureRejectsGarbage(t *testing.T) {
	if err := verifyCatalogSignature([]byte("payload"), make([]byte, 64)); err == nil {
		t.Fatal("invalid signature accepted")
	}
}

func resetCatalogState() {
	catalogOnce = sync.Once{}
	catalogMu.Lock()
	catalogData = Catalog{}
	catalogErr = nil
	catalogSource = "embedded"
	catalogChecked = time.Time{}
	catalogLastErr = ""
	embeddedVersion = ""
	embeddedUpdated = ""
	embeddedCount = 0
	catalogMu.Unlock()
}

func TestRefreshCatalogCacheAndETag(t *testing.T) {
	t.Setenv("LOCALAPPDATA", t.TempDir())
	body, err := os.ReadFile(filepath.Join("site", "catalog.json"))
	if err != nil {
		t.Fatal(err)
	}
	encodedSignature, err := os.ReadFile(filepath.Join("site", "catalog.sig"))
	if err != nil {
		t.Fatal(err)
	}
	signature, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(encodedSignature)))
	if err != nil {
		t.Fatal(err)
	}
	if err := writeCatalogCache(body, signature, `"test-etag"`); err != nil {
		t.Fatal(err)
	}

	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/catalog.json":
			requests.Add(1)
			if r.Header.Get("If-None-Match") == `"test-etag"` {
				w.WriteHeader(http.StatusNotModified)
				return
			}
			w.Header().Set("ETag", `"test-etag"`)
			_, _ = w.Write(body)
		case "/catalog.sig":
			_, _ = w.Write(encodedSignature)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	oldURLs := catalogURLs
	catalogURLs = []string{server.URL + "/catalog.json"}
	defer func() {
		catalogURLs = oldURLs
		resetCatalogState()
	}()
	resetCatalogState()

	app := &App{}
	if _, err := app.GetCatalog(); err != nil {
		t.Fatal(err)
	}
	if status := app.GetCatalogStatus(); status.Source != "cache" || status.ItemCount == 0 {
		t.Fatalf("cache status = %#v", status)
	}
	if _, err := app.RefreshCatalog(false); err != nil {
		t.Fatal(err)
	}
	if got := requests.Load(); got != 0 {
		t.Fatalf("fresh cache made %d network requests", got)
	}

	refresh, err := app.RefreshCatalog(true)
	if err != nil {
		t.Fatal(err)
	}
	if refresh.Updated {
		t.Fatal("304 response reported an update")
	}
	if got := requests.Load(); got != 1 {
		t.Fatalf("forced refresh made %d requests, want 1", got)
	}
	if status := app.GetCatalogStatus(); status.Source != "cache" || status.Error != "" || status.CheckedAt == "" {
		t.Fatalf("status after 304 = %#v", status)
	}
}

func TestNormalizeName(t *testing.T) {
	cases := map[string]string{
		"7-Zip 25.01 (x64)":   "7 zip 25 01 x64",
		"  Google   Chrome  ": "google chrome",
		"VLC media player":    "vlc media player",
	}
	for input, want := range cases {
		if got := normalizeName(input); got != want {
			t.Errorf("normalizeName(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestSplitPackageID(t *testing.T) {
	identity, version := splitPackageID("Microsoft.WindowsCalculator_11.2210.0.0_x64__8wekyb3d8bbwe")
	if identity != "Microsoft.WindowsCalculator" || version != "11.2210.0.0" {
		t.Fatalf("unexpected split: %q %q", identity, version)
	}
	if _, version := splitPackageID("Some.Package_NotAVersion_x64"); version != "" {
		t.Fatalf("non-version accepted: %q", version)
	}
}

func TestBestCatalogMatch(t *testing.T) {
	id, score := bestCatalogMatch("Test App", testCatalog().Items)
	if id != "Test.App" || score < 1000 {
		t.Fatalf("expected Test.App with exact score, got %q %d", id, score)
	}
	if id, _ := bestCatalogMatch("Unrelated Thing", testCatalog().Items); id != "" {
		t.Fatalf("unexpected match: %q", id)
	}
}

func TestParseWingetTable(t *testing.T) {
	output := `Name               Id                         Version   Available Source
--------------------------------------------------------------------------------
7-Zip              7zip.7zip                  25.01     25.02     winget
VLC media player   VideoLAN.VLC               3.0.21    3.0.22    winget
Up to date app     Example.UpToDate           1.0.0               winget
`
	rows := parseWingetTable(output)
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows with available versions, got %d: %#v", len(rows), rows)
	}
	if rows[0].id != "7zip.7zip" || rows[0].available != "25.02" {
		t.Fatalf("unexpected first row: %#v", rows[0])
	}
}

func TestBuildInstallScriptModes(t *testing.T) {
	run := &installRun{
		LogPath:    `C:\tmp\install.log`,
		CancelPath: `C:\tmp\cancel.flag`,
		WingetPath: `C:\winget.exe`,
		Command:    wgUninstall,
	}
	script := buildInstallScript(run, []InstallItem{{ID: "Test.App", Name: "Test App"}})
	if !strings.Contains(script, "$action = 'uninstall'") && !strings.Contains(script, "uninstall") {
		t.Fatal("uninstall command missing")
	}
	if strings.Contains(script, "--accept-package-agreements") {
		t.Fatal("uninstall must not pass --accept-package-agreements")
	}
	if !strings.Contains(script, "::FW_LOG|") {
		t.Fatal("streaming log markers missing")
	}
	if !strings.Contains(script, "::FW_END") {
		t.Fatal("end marker missing")
	}
}

func TestPSQuote(t *testing.T) {
	if got := psQuote("O'Brien"); got != "'O''Brien'" {
		t.Fatalf("unexpected quote: %s", got)
	}
}

func TestParseHealthDate(t *testing.T) {
	cases := []string{
		"2026-09-19T00:00:00.0000000",
		"2026-09-19T00:00:00.0000000Z",
		"2026-09-19T00:00:00+02:00",
		"2026-09-19",
	}
	for _, value := range cases {
		if _, ok := parseHealthDate(value); !ok {
			t.Errorf("parseHealthDate(%q) failed", value)
		}
	}
	if _, ok := parseHealthDate("not a date"); ok {
		t.Fatal("garbage date accepted")
	}
}

func TestDiskSpaceOrder(t *testing.T) {
	drive := os.Getenv("SystemDrive")
	if drive == "" {
		drive = "C:"
	}
	total, free := diskSpace(drive + `\`)
	if total == 0 {
		t.Skip("system drive is unavailable")
	}
	if free > total {
		t.Fatalf("diskSpace returned free=%d larger than total=%d", free, total)
	}
}

func TestModeTexts(t *testing.T) {
	cases := []string{wgInstall, wgUpgrade, wgUninstall, wgRepair}
	for _, mode := range cases {
		if message, note := modeSuccessText(mode); message == "" || note == "" {
			t.Fatalf("empty mode text for %s", mode)
		}
	}
}

func TestLogTailerIncremental(t *testing.T) {
	path := filepath.Join(t.TempDir(), "install.log")
	if err := os.WriteFile(path, []byte("one\ntw"), 0o600); err != nil {
		t.Fatal(err)
	}
	tail := &logTailer{path: path}
	defer tail.close()
	lines := tail.poll()
	if len(lines) != 1 || lines[0] != "one" {
		t.Fatalf("first poll = %#v", lines)
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.WriteString("o\nthr"); err != nil {
		t.Fatal(err)
	}
	_ = f.Close()
	lines = tail.poll()
	if len(lines) != 1 || lines[0] != "two" {
		t.Fatalf("second poll = %#v", lines)
	}
	f, _ = os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
	_, _ = f.WriteString("ee\n")
	_ = f.Close()
	lines = tail.poll()
	if len(lines) != 1 || lines[0] != "three" {
		t.Fatalf("poll after append = %#v", lines)
	}
	if lines = tail.flush(); len(lines) != 0 {
		t.Fatalf("flush = %#v", lines)
	}
	f, _ = os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
	_, _ = f.WriteString("four")
	_ = f.Close()
	if lines = tail.poll(); len(lines) != 0 {
		t.Fatalf("partial line should wait: %#v", lines)
	}
	if lines = tail.flush(); len(lines) != 1 || lines[0] != "four" {
		t.Fatalf("final flush = %#v", lines)
	}
}

func TestParseProfileFile(t *testing.T) {
	cat, err := loadCatalog()
	if err != nil || len(cat.Items) == 0 {
		t.Fatalf("catalog unavailable: %v", err)
	}
	valid := cat.Items[0].ID
	profile := ProfileFile{
		Format: profileFormat,
		Apps:   []ProfileApp{{ID: valid}, {ID: "Missing.Package"}},
		Settings: map[string]string{
			"theme": "dark",
			"lang":  "uk",
			"other": "ignored",
		},
	}
	data, _ := json.Marshal(profile)
	result, err := parseProfileFile("profile.json", data)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Apps) != 1 || result.Apps[0] != valid {
		t.Fatalf("apps = %#v", result.Apps)
	}
	if len(result.Unknown) != 1 || result.Unknown[0] != "Missing.Package" {
		t.Fatalf("unknown = %#v", result.Unknown)
	}
	if result.Settings["theme"] != "dark" || result.Settings["other"] != "" {
		t.Fatalf("settings = %#v", result.Settings)
	}

	exported := []byte(`{"Sources":[{"Packages":[{"PackageIdentifier":"` + valid + `"},{"PackageIdentifier":"Missing.Package"}]}]}`)
	result, err = parseProfileFile("winget.json", exported)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Apps) != 1 || len(result.Unknown) != 1 {
		t.Fatalf("winget import = %#v", result)
	}
}

func TestParseAppVersion(t *testing.T) {
	cases := []struct {
		raw  string
		want [3]int
		ok   bool
	}{
		{"1.1.0", [3]int{1, 1, 0}, true},
		{"v1.2", [3]int{1, 2, 0}, true},
		{"V2.10.3-beta.1", [3]int{2, 10, 3}, true},
		{"dev", [3]int{}, false},
		{"1.2.3.4", [3]int{}, false},
		{"1.x", [3]int{}, false},
	}
	for _, test := range cases {
		got, ok := parseAppVersion(test.raw)
		if ok != test.ok || got != test.want {
			t.Fatalf("parseAppVersion(%q) = %#v, %v; want %#v, %v", test.raw, got, ok, test.want, test.ok)
		}
	}
	if compareAppVersions([3]int{1, 10, 0}, [3]int{1, 9, 9}) <= 0 {
		t.Fatal("1.10.0 should be newer than 1.9.9")
	}
	if compareAppVersions([3]int{1, 1, 0}, [3]int{1, 1, 0}) != 0 {
		t.Fatal("equal versions compared as different")
	}
}

func TestFetchAppUpdate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") == "" {
			t.Error("missing User-Agent")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"tag_name": "v1.1.0",
			"name": "ReadyWin 1.1",
"body": "Release notes",
			"html_url": "https://github.com/LevrikM/readyWin/releases/tag/v1.1.0",
			"published_at": "2026-10-22T10:00:00Z",
			"assets": [
				{"name": "ReadyWin-1.1.0-windows-amd64.zip", "browser_download_url": "https://example.com/readywin.zip"},
				{"name": "ReadyWin.exe", "browser_download_url": "https://example.com/ReadyWin.exe"}
			]
		}`))
	}))
	defer server.Close()

	info := fetchAppUpdate(server.URL, "1.0.0")
	if info.Error != "" {
		t.Fatal(info.Error)
	}
	if !info.Available || info.LatestVersion != "1.1.0" {
		t.Fatalf("unexpected update: %#v", info)
	}
	if info.DownloadURL != "https://example.com/ReadyWin.exe" {
		t.Fatalf("download URL = %q", info.DownloadURL)
	}
	if info.Notes != "Release notes" || info.ReleaseURL == "" {
		t.Fatalf("release details = %#v", info)
	}

	current := fetchAppUpdate(server.URL, "1.1.0")
	if current.Available || current.Error != "" {
		t.Fatalf("same version reported as update: %#v", current)
	}
}
