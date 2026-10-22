package main

import (
	"syscall"
	"unsafe"
)

const errorAlreadyExists syscall.Errno = 183

var singleInstanceHandle syscall.Handle
var (
	kernel32DLL      = syscall.NewLazyDLL("kernel32.dll")
	procCreateMutexW = kernel32DLL.NewProc("CreateMutexW")
	user32DLL        = syscall.NewLazyDLL("user32.dll")
	procMessageBoxW  = user32DLL.NewProc("MessageBoxW")
)

// acquireSingleInstance prevents two ReadyWin windows from starting installs
// at the same time against the same machine.
func acquireSingleInstance() bool {
	name, err := syscall.UTF16PtrFromString(`Local\ReadyWin.SingleInstance`)
	if err != nil {
		return true
	}
	handle, _, callErr := procCreateMutexW.Call(0, 0, uintptr(unsafe.Pointer(name)))
	if handle == 0 {
		return true
	}
	if errno, ok := callErr.(syscall.Errno); ok && errno == errorAlreadyExists {
		return false
	}
	singleInstanceHandle = syscall.Handle(handle)
	return true
}

func showAlreadyRunning() {
	lang := loadLanguagePreference()
	if lang == "" {
		lang = "uk"
	}
	messages := map[string]string{
		"uk": "ReadyWin уже запущено. Перейдіть до відкритого вікна застосунку.",
		"en": "ReadyWin is already running. Switch to the open application window.",
		"de": "ReadyWin läuft bereits. Wechseln Sie zum geöffneten Anwendungsfenster.",
		"ru": "ReadyWin уже запущен. Перейдите к открытому окну приложения.",
	}
	text, _ := syscall.UTF16PtrFromString(messages[lang])
	caption, _ := syscall.UTF16PtrFromString("ReadyWin")
	_, _, _ = procMessageBoxW.Call(0, uintptr(unsafe.Pointer(text)), uintptr(unsafe.Pointer(caption)), 0x00000040)
}
