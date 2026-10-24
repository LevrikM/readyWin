# ReadyWin

ReadyWin is a Windows desktop app for setting up a fresh system. It scans what is
already installed, shows what is missing, and installs the rest through winget.
No account, no telemetry, no background services.

Built with Go and Wails v2. The frontend is React and TypeScript.

## What it does

- **System scan.** Reads the uninstall keys in HKLM, WOW6432Node and HKCU, plus
  Microsoft Store and MSIX packages. Matches results against the catalog. Takes
  about a second.
- **Runtime checks.** DirectX, Visual C++ x64/x86, .NET Desktop Runtime, WebView2,
  Windows Terminal, PowerShell 7 and WSL are detected by files, registry keys and
  versions.
- **Catalog.** 201 apps in 12 groups. Search by name, publisher, description or
  tag, filter by group and by state (all, missing, installed, updates).
- **Presets.** Five ready sets: Base, Development, Games, Creative, AI.
- **Install queue.** One UAC prompt for the whole queue, per-package progress, live
  log, cancel between items, then a before/after diff with the apps that appeared
  or disappeared.
- **Uninstall and repair.** Same queue, same log, same single UAC prompt.
- **History.** Recent install, upgrade, uninstall and repair runs with duration and
  result.
- **Health page.** Read-only checks: pending reboot, Defender, firewall, BitLocker,
  Secure Boot, activation, SMART wear, free memory and disk, uptime, latest update,
  restore point.
- **Battery report.** Reads `powercfg /batteryreport` plus WMI: health percentage,
  design and full capacity, cycle count, chemistry, charge and estimated runtime.
  Hidden on desktops.
- **Event log digest.** Top error and critical events from System and Application
  logs over the last seven days, grouped by source and event ID. Read-only by
  design.
- **Disk space.** Measures temp folders, Windows Update cache, Delivery Optimization
  cache, crash dumps and thumbnail cache, then deletes only the ones you select.
  Downloads, Desktop, Documents, Videos and Pictures are shown for reference and
  cannot be cleaned from the app.
- **Windows Update.** Shows edition, build, activation state, license channel and
  the latest hotfix. Pause updates for 7, 14 or 35 days by writing the same
  registry values Windows Settings uses. Resume removes them.
- **Startup entries.** Run and RunOnce keys, Startup folder shortcuts and scheduled
  tasks with logon or boot triggers. Entries can be disabled and enabled without
  deleting them.
- **App updates.** Checks `winget upgrade`, then upgrades through the same queue.
- **ReadyWin updates.** Checks GitHub Releases at startup and on demand, downloads
  with progress, verifies SHA256, and installs in place through a detached helper.
  Restarts the app when done. Falls back to a UAC prompt if the install folder is
  read-only, and rolls back to the previous binary on failure.
- **Signed catalog.** The catalog is fetched over HTTPS from GitHub or Vercel and
  verified with an Ed25519 signature. ETag support, six hour cache, embedded
  fallback for offline use.
- **winget search.** The curated catalog stays the default. A separate search panel
  queries the public winget repository for anything else, with a confirmation step
  before install. winget verifies the installer hash against its signed manifest.
- **Transfer.** Export selected apps, theme and language to one ReadyWin file, or
  use standard `winget export`. Import adds found apps to the queue for review; it
  never installs silently.
- **Settings page.** Theme, language, ReadyWin updates, data folder and version.
- **Theme and language.** Paper light and dark themes, following the system
  preference. Interface in Ukrainian, English, German and Russian.

## Requirements

- Windows 10 1809 or newer, or Windows 11.
- [winget](https://learn.microsoft.com/windows/package-manager/winget/) (App
  Installer). Included in Windows 11; on Windows 10 update App Installer from the
  Microsoft Store.
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).
  Included in Windows 11; the Wails installer adds it on Windows 10 when needed.
- Internet access for downloads.

To build from source: Go 1.21+, Node.js 18+ and the
[Wails CLI](https://wails.io/docs/gettingstarted/installation) v2.

## Install

Download `ReadyWin.exe` from the latest release. It is a single file with the
frontend embedded, so there is nothing to install. The zip archive is the portable
package. Both come with SHA256 checksums.

Verify a download:

```powershell
Get-FileHash .\ReadyWin.exe -Algorithm SHA256
Get-Content .\ReadyWin.exe.sha256
```

## Build

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails build
```

The result is `build/bin/ReadyWin.exe`. Use `wails build -upx` for a smaller binary
if UPX is installed.

Development with frontend hot reload:

```powershell
wails dev
```

The frontend can also run alone in a browser:

```powershell
cd frontend
npm install
npm run dev
```

`frontend/src/bridge.ts` switches to mock data when the app is not running inside
Wails. A DEMO badge appears in the corner.

Checks:

```powershell
go vet ./...
go test ./...
cd frontend; npx tsc --noEmit; npm run build
```

## Release

Releases are automatic. Bump the version in `app.go`, `wails.json` and
`frontend/package.json`, then push to `main`. The CI workflow rejects a push where
those three do not match.

`.github/workflows/release.yml` reads the version from `wails.json`. If the tag
`v<version>` does not exist yet, it creates the tag, builds the app with
`-ldflags "-X main.appVersion=<version>"` and publishes `ReadyWin.exe`, the
portable zip and their `.sha256` files. If the tag already exists, the run does
nothing, so ordinary commits do not create releases.

Pushing a `v*` tag by hand still works and republishes that version.
`workflow_dispatch` rebuilds the version from `wails.json`, or takes a version
from the input. Use `dev` there to build without publishing.

Signing needs the `SIGNPATH_API_TOKEN` secret and the
`SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG` and
`SIGNPATH_SIGNING_POLICY_SLUG` variables. Without them the build is unsigned but
checksums are still published. See [CODE_SIGNING.md](CODE_SIGNING.md).

`.github/workflows/ci.yml` runs `go test ./...`, `go vet ./...`, the frontend
build and the version check on every push and pull request.

## Data and privacy

Settings, logs, install runs, the catalog cache and downloaded updates live under
`%LOCALAPPDATA%\ReadyWin`. The Settings page opens that folder.

No telemetry and no analytics. Network requests go to the project site and GitHub
for the catalog, the GitHub Releases API for update checks, and winget for package
operations.

## Website

The static site in `site/` has the same four languages as the app. Root
`vercel.json` points Vercel at that directory, so the repository deploys without
changes.
