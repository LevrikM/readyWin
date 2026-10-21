package main

import (
	"context"
	"errors"
	"net/url"
	"os/exec"
	"sync"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const appVersion = "1.0.0"

type App struct {
	ctx context.Context

	mu      sync.Mutex
	install InstallState
	run     *installRun
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetVersion() string {
	return appVersion
}

func (a *App) OpenExternal(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
		return errors.New("некоректне посилання")
	}
	return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", rawURL).Start()
}

// Bound window controls for the frameless titlebar; work without the injected Wails runtime.
func (a *App) Minimise() {
	if a.ctx != nil {
		wruntime.WindowMinimise(a.ctx)
	}
}

func (a *App) ToggleMaximise() {
	if a.ctx != nil {
		wruntime.WindowToggleMaximise(a.ctx)
	}
}

func (a *App) Hide() {
	if a.ctx != nil {
		wruntime.WindowHide(a.ctx)
	}
}

func (a *App) Quit() {
	if a.ctx != nil {
		wruntime.Quit(a.ctx)
	}
}
