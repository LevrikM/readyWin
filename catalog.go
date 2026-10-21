package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sync"
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

var (
	catalogOnce sync.Once
	catalogData Catalog
	catalogErr  error
)

func loadCatalog() (Catalog, error) {
	catalogOnce.Do(func() {
		if err := json.Unmarshal(catalogJSON, &catalogData); err != nil {
			catalogErr = fmt.Errorf("каталог: %w", err)
			return
		}
		if len(catalogData.Items) == 0 {
			catalogErr = fmt.Errorf("каталог порожній")
		}
	})
	return catalogData, catalogErr
}

func (a *App) GetCatalog() (Catalog, error) {
	return loadCatalog()
}
