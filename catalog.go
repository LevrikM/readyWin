package main

import (
	"bytes"
	"context"
	"crypto/ed25519"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

//go:embed shared/catalog.json
var catalogJSON []byte

type Group struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	NameEn        string `json:"nameEn"`
	DescriptionEn string `json:"descriptionEn"`
	Index         int    `json:"index"`
}

type Preset struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	NameEn        string   `json:"nameEn"`
	DescriptionEn string   `json:"descriptionEn"`
	Items         []string `json:"items"`
}

type Item struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	ShortName     string   `json:"shortName"`
	Publisher     string   `json:"publisher"`
	Description   string   `json:"description"`
	DescriptionEn string   `json:"descriptionEn"`
	Homepage      string   `json:"homepage"`
	Group         string   `json:"group"`
	Icon          string   `json:"icon"`
	Tags          []string `json:"tags"`
	SizeMB        int      `json:"sizeMb"`
	Recommended   bool     `json:"recommended"`
	Note          string   `json:"note"`
	Match         []string `json:"match"`
}

type Catalog struct {
	Version string   `json:"version"`
	Updated string   `json:"updated"`
	Groups  []Group  `json:"groups"`
	Presets []Preset `json:"presets"`
	Items   []Item   `json:"items"`
}

// CatalogStatus describes where the catalog currently in memory came from.
type CatalogStatus struct {
	Source          string `json:"source"`
	Version         string `json:"version"`
	Updated         string `json:"updated"`
	ItemCount       int    `json:"itemCount"`
	EmbeddedVersion string `json:"embeddedVersion"`
	EmbeddedUpdated string `json:"embeddedUpdated"`
	CheckedAt       string `json:"checkedAt"`
	Error           string `json:"error,omitempty"`
}

type CatalogRefresh struct {
	Updated bool          `json:"updated"`
	Catalog Catalog       `json:"catalog"`
	Status  CatalogStatus `json:"status"`
}

const (
	// Ed25519 public key (base64url) used to verify detached catalog signatures.
	// The matching private key lives in .keys/ and is never committed.
	catalogPublicKey = "h4JBc7W_oxj5IRFCRqGpoyVYatE4qU5AdvqZxvZVRls"

	catalogMaxBytes  = 4 << 20
	catalogCacheTTL  = 6 * time.Hour
	catalogUserAgent = "ReadyWin-Catalog/1"
)

var catalogURLs = []string{
	"https://readywin.vercel.app/catalog.json",
	"https://raw.githubusercontent.com/LevrikM/readyWin/main/site/catalog.json",
}

var (
	catalogOnce      sync.Once
	catalogMu        sync.RWMutex
	catalogRefreshMu sync.Mutex
	catalogData      Catalog
	catalogErr       error
	catalogSource    = "embedded"
	catalogChecked   time.Time
	catalogLastErr   string
	embeddedVersion  string
	embeddedUpdated  string
	embeddedCount    int
)

func loadCatalog() (Catalog, error) {
	catalogOnce.Do(func() {
		if err := json.Unmarshal(catalogJSON, &catalogData); err != nil {
			catalogErr = fmt.Errorf("каталог: %w", err)
			return
		}
		if err := validateCatalog(catalogData); err != nil {
			catalogErr = fmt.Errorf("вбудований каталог: %w", err)
			return
		}
		embeddedVersion = catalogData.Version
		embeddedUpdated = catalogData.Updated
		embeddedCount = len(catalogData.Items)

		if cached, checkedAt, err := readCatalogCache(); err == nil && cached.Updated >= catalogData.Updated {
			catalogData = cached
			catalogSource = "cache"
			catalogChecked = checkedAt
		}
	})
	catalogMu.RLock()
	defer catalogMu.RUnlock()
	return catalogData, catalogErr
}

func (a *App) GetCatalog() (Catalog, error) {
	return loadCatalog()
}

func (a *App) GetCatalogStatus() CatalogStatus {
	_, _ = loadCatalog()
	return currentCatalogStatus()
}

func currentCatalogStatus() CatalogStatus {
	catalogMu.RLock()
	defer catalogMu.RUnlock()
	status := CatalogStatus{
		Source:          catalogSource,
		Version:         catalogData.Version,
		Updated:         catalogData.Updated,
		ItemCount:       len(catalogData.Items),
		EmbeddedVersion: embeddedVersion,
		EmbeddedUpdated: embeddedUpdated,
		Error:           catalogLastErr,
	}
	if !catalogChecked.IsZero() {
		status.CheckedAt = catalogChecked.Format(time.RFC3339)
	}
	return status
}

// RefreshCatalog downloads a signed catalog when the local copy is older than
// the cache TTL. With force it still honours ETag (304 is cheap) but bypasses
// the TTL. The embedded catalog remains the fallback for offline use.
func (a *App) RefreshCatalog(force bool) (CatalogRefresh, error) {
	catalogRefreshMu.Lock()
	defer catalogRefreshMu.Unlock()

	current, err := loadCatalog()
	if err != nil {
		return CatalogRefresh{}, err
	}

	catalogMu.RLock()
	checked := catalogChecked
	source := catalogSource
	catalogMu.RUnlock()
	if !force && source != "embedded" && !checked.IsZero() && time.Since(checked) < catalogCacheTTL {
		return CatalogRefresh{Catalog: current, Status: currentCatalogStatus()}, nil
	}

	etag := readCatalogETag()
	client := &http.Client{Timeout: 20 * time.Second}
	var lastErr error

	for _, baseURL := range catalogURLs {
		body, signature, newETag, notModified, fetchErr := fetchCatalog(client, baseURL, etag)
		if fetchErr != nil {
			lastErr = fetchErr
			continue
		}
		if notModified {
			catalogMu.Lock()
			catalogChecked = time.Now()
			catalogLastErr = ""
			catalogMu.Unlock()
			return CatalogRefresh{Catalog: current, Status: currentCatalogStatus()}, nil
		}
		if verifyErr := verifyCatalogSignature(body, signature); verifyErr != nil {
			lastErr = verifyErr
			continue
		}
		var remote Catalog
		if decodeErr := json.Unmarshal(body, &remote); decodeErr != nil {
			lastErr = fmt.Errorf("каталог: %w", decodeErr)
			continue
		}
		if validateErr := validateCatalog(remote); validateErr != nil {
			lastErr = validateErr
			continue
		}
		if embeddedCount > 0 && len(remote.Items) < embeddedCount/2 {
			lastErr = fmt.Errorf("каталог містить підозріло мало позицій (%d)", len(remote.Items))
			continue
		}
		if remote.Updated < current.Updated {
			catalogMu.Lock()
			catalogChecked = time.Now()
			catalogLastErr = ""
			catalogMu.Unlock()
			return CatalogRefresh{Catalog: current, Status: currentCatalogStatus()}, nil
		}
		if remote.Updated == current.Updated && bytes.Equal(mustMarshal(remote), mustMarshal(current)) {
			catalogMu.Lock()
			catalogChecked = time.Now()
			catalogLastErr = ""
			catalogMu.Unlock()
			return CatalogRefresh{Catalog: current, Status: currentCatalogStatus()}, nil
		}

		if writeErr := writeCatalogCache(body, signature, newETag); writeErr != nil {
			lastErr = writeErr
			continue
		}
		catalogMu.Lock()
		catalogData = remote
		catalogSource = "remote"
		catalogChecked = time.Now()
		catalogLastErr = ""
		catalogMu.Unlock()
		return CatalogRefresh{Updated: true, Catalog: remote, Status: currentCatalogStatus()}, nil
	}

	if lastErr == nil {
		lastErr = errors.New("каталог недоступний")
	}
	catalogMu.Lock()
	catalogChecked = time.Now()
	catalogLastErr = lastErr.Error()
	catalogMu.Unlock()
	return CatalogRefresh{Catalog: current, Status: currentCatalogStatus()}, lastErr
}

func fetchCatalog(client *http.Client, baseURL, etag string) ([]byte, []byte, string, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL, nil)
	if err != nil {
		return nil, nil, "", false, err
	}
	req.Header.Set("User-Agent", catalogUserAgent)
	req.Header.Set("Accept", "application/json")
	if etag != "" {
		req.Header.Set("If-None-Match", etag)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, "", false, fmt.Errorf("каталог: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotModified {
		return nil, nil, etag, true, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, nil, "", false, fmt.Errorf("каталог: HTTP %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, catalogMaxBytes+1))
	if err != nil {
		return nil, nil, "", false, fmt.Errorf("каталог: %w", err)
	}
	if len(body) > catalogMaxBytes {
		return nil, nil, "", false, errors.New("каталог завеликий")
	}

	sigURL := strings.TrimSuffix(baseURL, ".json") + ".sig"
	sigReq, err := http.NewRequestWithContext(ctx, http.MethodGet, sigURL, nil)
	if err != nil {
		return nil, nil, "", false, err
	}
	sigReq.Header.Set("User-Agent", catalogUserAgent)
	sigResp, err := client.Do(sigReq)
	if err != nil {
		return nil, nil, "", false, fmt.Errorf("підпис каталогу: %w", err)
	}
	defer sigResp.Body.Close()
	if sigResp.StatusCode != http.StatusOK {
		return nil, nil, "", false, fmt.Errorf("підпис каталогу: HTTP %d", sigResp.StatusCode)
	}
	sigRaw, err := io.ReadAll(io.LimitReader(sigResp.Body, 4096))
	if err != nil {
		return nil, nil, "", false, fmt.Errorf("підпис каталогу: %w", err)
	}
	signature, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(sigRaw)))
	if err != nil || len(signature) != ed25519.SignatureSize {
		return nil, nil, "", false, errors.New("підпис каталогу пошкоджений")
	}
	return body, signature, resp.Header.Get("ETag"), false, nil
}

func verifyCatalogSignature(payload, signature []byte) error {
	if catalogPublicKey == "" {
		return nil
	}
	key, err := base64.RawURLEncoding.DecodeString(catalogPublicKey)
	if err != nil || len(key) != ed25519.PublicKeySize {
		return errors.New("публічний ключ каталогу пошкоджений")
	}
	if !ed25519.Verify(ed25519.PublicKey(key), payload, signature) {
		return errors.New("підпис каталогу недійсний")
	}
	return nil
}

func validateCatalog(c Catalog) error {
	if strings.TrimSpace(c.Version) == "" {
		return errors.New("каталог: не вказано версію")
	}
	if strings.TrimSpace(c.Updated) == "" {
		return errors.New("каталог: не вказано дату оновлення")
	}
	if len(c.Items) == 0 {
		return errors.New("каталог порожній")
	}
	if len(c.Items) > 5000 {
		return errors.New("каталог містить забагато позицій")
	}
	if len(c.Groups) == 0 {
		return errors.New("каталог: немає груп")
	}
	groups := make(map[string]bool, len(c.Groups))
	for _, group := range c.Groups {
		if strings.TrimSpace(group.ID) == "" || strings.TrimSpace(group.Name) == "" {
			return errors.New("каталог: група без ID або назви")
		}
		if groups[group.ID] {
			return fmt.Errorf("каталог: дубль групи %s", group.ID)
		}
		groups[group.ID] = true
	}
	items := make(map[string]bool, len(c.Items))
	for _, item := range c.Items {
		if !wingetIDPattern.MatchString(item.ID) {
			return fmt.Errorf("каталог: некоректний ID %q", item.ID)
		}
		if items[item.ID] {
			return fmt.Errorf("каталог: дубль позиції %s", item.ID)
		}
		items[item.ID] = true
		if strings.TrimSpace(item.Name) == "" || strings.TrimSpace(item.ShortName) == "" {
			return fmt.Errorf("каталог: позиція %s без назви", item.ID)
		}
		if !groups[item.Group] {
			return fmt.Errorf("каталог: позиція %s посилається на невідому групу %s", item.ID, item.Group)
		}
	}
	for _, preset := range c.Presets {
		for _, id := range preset.Items {
			if !items[id] {
				return fmt.Errorf("каталог: набір %s посилається на невідому позицію %s", preset.ID, id)
			}
		}
	}
	return nil
}

func readCatalogCache() (Catalog, time.Time, error) {
	dir, err := dataDir()
	if err != nil {
		return Catalog{}, time.Time{}, err
	}
	cachePath := filepath.Join(dir, "catalog.cache.json")
	info, err := os.Stat(cachePath)
	if err != nil {
		return Catalog{}, time.Time{}, err
	}
	body, err := os.ReadFile(cachePath)
	if err != nil {
		return Catalog{}, time.Time{}, err
	}
	if len(body) > catalogMaxBytes {
		return Catalog{}, time.Time{}, errors.New("кеш каталогу завеликий")
	}
	sig, err := os.ReadFile(filepath.Join(dir, "catalog.cache.sig"))
	if err != nil {
		return Catalog{}, time.Time{}, err
	}
	if err := verifyCatalogSignature(body, sig); err != nil {
		return Catalog{}, time.Time{}, err
	}
	var cached Catalog
	if err := json.Unmarshal(body, &cached); err != nil {
		return Catalog{}, time.Time{}, err
	}
	if err := validateCatalog(cached); err != nil {
		return Catalog{}, time.Time{}, err
	}
	return cached, info.ModTime(), nil
}

func writeCatalogCache(body, signature []byte, etag string) error {
	dir, err := dataDir()
	if err != nil {
		return err
	}
	if err := writeFileAtomic(filepath.Join(dir, "catalog.cache.json"), body, 0o644); err != nil {
		return err
	}
	if err := writeFileAtomic(filepath.Join(dir, "catalog.cache.sig"), signature, 0o644); err != nil {
		return err
	}
	if etag != "" {
		if err := writeFileAtomic(filepath.Join(dir, "catalog.etag"), []byte(etag), 0o644); err != nil {
			return err
		}
	}
	return nil
}

func readCatalogETag() string {
	dir, err := dataDir()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(dir, "catalog.etag"))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func mustMarshal(v any) []byte {
	data, _ := json.Marshal(v)
	return data
}
