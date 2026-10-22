package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
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

func TestUpdateHelpers(t *testing.T) {
	valid := strings.Repeat("a", 64)
	if got := normalizeSHA256("  " + strings.ToUpper(valid) + " "); got != valid {
		t.Fatalf("normalizeSHA256 = %q", got)
	}
	if got := normalizeSHA256(strings.Repeat("g", 64)); got != "" {
		t.Fatalf("invalid hex accepted: %q", got)
	}
	if got := normalizeSHA256(valid[:63]); got != "" {
		t.Fatalf("short hash accepted: %q", got)
	}

	allowed := []string{
		"https://github.com/LevrikM/readyWin/releases/download/v1.2.0/ReadyWin.exe",
		"https://objects.githubusercontent.com/some/asset",
	}
	for _, raw := range allowed {
		if err := validateUpdateURL(raw); err != nil {
			t.Fatalf("validateUpdateURL(%q): %v", raw, err)
		}
	}
	rejected := []string{
		"http://github.com/ReadyWin.exe",
		"https://example.com/ReadyWin.exe",
		"https://evilgithub.com/ReadyWin.exe",
		"https://github.com.evil.test/ReadyWin.exe",
		"",
	}
	for _, raw := range rejected {
		if err := validateUpdateURL(raw); err == nil {
			t.Fatalf("validateUpdateURL accepted %q", raw)
		}
	}

	cases := map[string]string{
		"https://github.com/LevrikM/readyWin/releases/download/v1.2.0/ReadyWin.exe": "ReadyWin.exe",
		"https://github.com/LevrikM/readyWin/releases/download/v1.2.0/..":           "ReadyWin-1.2.0.exe",
		"https://github.com/LevrikM/readyWin/releases/download/v1.2.0/":             "ReadyWin-1.2.0.exe",
		"https://github.com/LevrikM/readyWin/releases/download/v1.2.0/a:b%3F.exe":   "a-b-.exe",
	}
	for raw, want := range cases {
		if got := safeUpdateName(raw, "1.2.0"); got != want {
			t.Fatalf("safeUpdateName(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestMergeElevatedHealth(t *testing.T) {
	wear := 7
	temp := 41
	base := HealthReport{
		Disks: []DiskHealth{{Name: "Disk A", Media: "ssd", Health: "healthy", SizeGB: 100}},
		Items: []HealthItem{
			{ID: "bitlocker", Status: "unknown", Value: "unknown"},
			{ID: "defender", Status: "ok"},
		},
		Error: "base disk error",
	}
	elevated := psElevatedHealth{
		Disks: []psDisk{
			{Name: "disk a", Media: "SSD", Health: "Healthy", Operational: "OK", Size: 100 << 30, Wear: &wear, Temperature: &temp},
			{Name: "Disk B", Media: "HDD", Health: "Warning", Size: 2 << 30},
		},
		BitLocker: psBitLocker{Status: "On", Method: "XtsAes256"},
	}

	merged := mergeElevatedHealth(base, elevated)
	if !merged.Elevated || merged.ElevatedError != "" || merged.Error != "" {
		t.Fatalf("merged flags = %#v", merged)
	}
	if len(merged.Disks) != 2 {
		t.Fatalf("disks = %#v", merged.Disks)
	}
	if merged.Disks[0].Name != "disk a" || merged.Disks[0].Wear == nil || *merged.Disks[0].Wear != wear || merged.Disks[0].Temperature == nil || *merged.Disks[0].Temperature != temp {
		t.Fatalf("merged disk = %#v", merged.Disks[0])
	}
	if merged.Disks[1].Media != "hdd" || merged.Disks[1].SizeGB != 2 {
		t.Fatalf("appended disk = %#v", merged.Disks[1])
	}
	if len(merged.Items) != 2 || merged.Items[0].ID != "bitlocker" || merged.Items[0].Status != "ok" || merged.Items[0].Value != "on" || merged.Items[0].Detail != "XtsAes256" {
		t.Fatalf("bitlocker item = %#v", merged.Items)
	}
	if merged.Items[1].ID != "defender" {
		t.Fatalf("unrelated item changed: %#v", merged.Items)
	}
}

func TestBitlockerHealthItem(t *testing.T) {
	cases := []struct {
		status string
		want   string
	}{
		{"on", "ok"},
		{"off", "warn"},
		{"", "unknown"},
	}
	for _, tc := range cases {
		item := bitlockerHealthItem(psBitLocker{Status: tc.status, Method: " method "})
		if item.ID != "bitlocker" || item.Status != tc.want || item.Detail != "method" {
			t.Fatalf("bitlockerHealthItem(%q) = %#v", tc.status, item)
		}
	}
}

type updateRoundTripper struct {
	api     string
	asset   string
	payload []byte
	digest  string
}

func (rt *updateRoundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	response := func(status int, body string) *http.Response {
		return &http.Response{
			StatusCode: status,
			Status:     fmt.Sprintf("%d %s", status, http.StatusText(status)),
			Header:     make(http.Header),
			Body:       io.NopCloser(strings.NewReader(body)),
			Request:    request,
		}
	}
	switch request.URL.String() {
	case rt.api:
		body := fmt.Sprintf(`{"tag_name":"v9.9.9","name":"ReadyWin 9.9.9","body":"Notes","html_url":"https://github.com/LevrikM/readyWin/releases/tag/v9.9.9","published_at":"2026-10-22T10:00:00Z","assets":[{"name":"ReadyWin.exe","browser_download_url":%q,"size":%d,"digest":"sha256:%s"}]}`, rt.asset, len(rt.payload), rt.digest)
		return response(http.StatusOK, body), nil
	case rt.asset:
		res := response(http.StatusOK, string(rt.payload))
		res.ContentLength = int64(len(rt.payload))
		return res, nil
	default:
		return response(http.StatusNotFound, ""), nil
	}
}

func TestDownloadAppUpdate(t *testing.T) {
	t.Setenv("LOCALAPPDATA", t.TempDir())

	payload := []byte("first readywin build")
	sum := sha256.Sum256(payload)
	rt := &updateRoundTripper{
		api:     "https://api.github.com/repos/LevrikM/readyWin/releases/latest",
		asset:   "https://github.com/LevrikM/readyWin/releases/download/v9.9.9/ReadyWin.exe",
		payload: payload,
		digest:  fmt.Sprintf("%x", sum),
	}
	client := &http.Client{Transport: rt}

	oldAPI, oldUpdateClient, oldDownloadClient := appReleaseURL, appUpdateHTTPClient, appDownloadClient
	oldCache, oldCacheAt := appUpdateCache, appUpdateCacheAt
	defer func() {
		appReleaseURL, appUpdateHTTPClient, appDownloadClient = oldAPI, oldUpdateClient, oldDownloadClient
		appUpdateCache, appUpdateCacheAt = oldCache, oldCacheAt
	}()
	resetUpdate := func() {
		appReleaseURL = rt.api
		appUpdateHTTPClient = client
		appDownloadClient = client
		appUpdateCache = nil
		appUpdateCacheAt = time.Time{}
	}

	resetUpdate()
	app := &App{}
	first, err := app.DownloadAppUpdate()
	if err != nil {
		t.Fatal(err)
	}
	if first.SHA256 != rt.digest || first.Size != int64(len(payload)) {
		t.Fatalf("download result = %#v", first)
	}
	stored, err := os.ReadFile(first.Path)
	if err != nil {
		t.Fatal(err)
	}
	if string(stored) != string(payload) {
		t.Fatalf("stored payload = %q", stored)
	}

	secondPayload := []byte("second readywin build, longer")
	secondSum := sha256.Sum256(secondPayload)
	rt.payload = secondPayload
	rt.digest = fmt.Sprintf("%x", secondSum)
	resetUpdate()
	second, err := app.DownloadAppUpdate()
	if err != nil {
		t.Fatal(err)
	}
	if second.Path != first.Path {
		t.Fatalf("path changed: %q != %q", second.Path, first.Path)
	}
	stored, err = os.ReadFile(second.Path)
	if err != nil {
		t.Fatal(err)
	}
	if string(stored) != string(secondPayload) {
		t.Fatalf("overwritten payload = %q", stored)
	}

	rt.digest = strings.Repeat("0", 64)
	resetUpdate()
	if _, err := app.DownloadAppUpdate(); err == nil || !strings.Contains(err.Error(), "SHA256") {
		t.Fatalf("hash mismatch error = %v", err)
	}
	if _, err := os.Stat(second.Path + ".part"); !os.IsNotExist(err) {
		t.Fatalf("partial file left behind: %v", err)
	}
	if stored, err := os.ReadFile(second.Path); err != nil || string(stored) != string(secondPayload) {
		t.Fatalf("verified file was damaged: %q, %v", stored, err)
	}
}
