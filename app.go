package main

import (
	"context"
	"errors"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// appVersion is overridden at build time with -ldflags "-X main.appVersion=...".
var appVersion = "1.3.0"

type App struct {
	ctx context.Context

	mu             sync.Mutex
	install        InstallState
	run            *installRun
	lang           string
	updateSettings AppUpdateSettings
	updateApplying bool
}

func NewApp() *App {
	lang := loadLanguagePreference()
	if lang == "" {
		lang = "uk"
	}
	return &App{lang: lang}
}

// SetLanguage lets native dialogs use the language selected in the UI.
func (a *App) SetLanguage(lang string) {
	switch lang {
	case "uk", "en", "de", "ru":
		a.mu.Lock()
		a.lang = lang
		a.mu.Unlock()
		// The second-instance dialog runs before the UI exists, so remember the
		// choice on disk as well as in localStorage.
		_ = saveLanguagePreference(lang)
	}
}

func saveLanguagePreference(lang string) error {
	dir, err := dataDir()
	if err != nil {
		return err
	}
	return writeFileAtomic(filepath.Join(dir, "language.txt"), []byte(lang+"\n"), 0o644)
}

func loadLanguagePreference() string {
	dir, err := dataDir()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(filepath.Join(dir, "language.txt"))
	if err != nil {
		return ""
	}
	lang := strings.TrimSpace(string(data))
	switch lang {
	case "uk", "en", "de", "ru":
		return lang
	default:
		return ""
	}
}

var closeBlockedMessages = map[string]string{
	"uk": "Операція ще виконується. Скасуйте чергу або дочекайтеся завершення, перш ніж закривати застосунок.",
	"en": "An operation is still running. Cancel the queue or wait for it to finish before closing the app.",
	"de": "Ein Vorgang läuft noch. Brechen Sie die Warteschlange ab oder warten Sie, bis er abgeschlossen ist, bevor Sie die App schließen.",
	"ru": "Операция ещё выполняется. Отмените очередь или дождитесь завершения, прежде чем закрывать приложение.",
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.reconcileAppUpdate()
	go cleanupStorage()
	go func() { _, _ = loadCatalog() }()
	go a.autoCheckAppUpdate()
}

// beforeClose keeps the window open while winget is still working, so a
// finished run is never lost from history and the user does not have to guess
// whether it is safe to quit.
func (a *App) beforeClose(ctx context.Context) bool {
	a.mu.Lock()
	active := a.install.Active
	lang := a.lang
	a.mu.Unlock()
	if !active {
		return false
	}
	message := closeBlockedMessages[lang]
	if message == "" {
		message = closeBlockedMessages["en"]
	}
	_, _ = wruntime.MessageDialog(ctx, wruntime.MessageDialogOptions{
		Type:    wruntime.InfoDialog,
		Title:   "ReadyWin",
		Message: message,
		Buttons: []string{"OK"},
	})
	return true
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
