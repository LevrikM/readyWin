package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	if !acquireSingleInstance() {
		showAlreadyRunning()
		return
	}
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "ReadyWin",
		Width:            1320,
		Height:           860,
		MinWidth:         1040,
		MinHeight:        700,
		Frameless:        true,
		BackgroundColour: &options.RGBA{R: 243, G: 240, B: 232, A: 1},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:     app.startup,
		OnBeforeClose: app.beforeClose,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
