import catalogJson from '../../shared/catalog.json'
import type {
  AppUpdateDownload,
  AppUpdateInfo,
  AppUpdateProgress,
  AppUpdateResult,
  AppUpdateSettings,
  BatteryHealth,
  Catalog,
  CatalogRefreshResult,
  CatalogStatus,
  DiskCleanResult,
  DiskUsageReport,
  EventLogReport,
  HealthReport,
  HistoryEntry,
  ImportResult,
  InstallEvent,
  InstallMode,
  InstallState,
  ScanResult,
  StartupEntry,
  StartupReport,
  SystemCheck,
  TransferResult,
  UpdateReport,
  WindowsUpdateState,
  WingetSearchResult,
} from './types'

const catalog = catalogJson as Catalog

type WailsApp = {
  GetCatalog: () => Promise<Catalog>
  GetCatalogStatus: () => Promise<CatalogStatus>
  RefreshCatalog: (force: boolean) => Promise<CatalogRefreshResult>
  Scan: () => Promise<ScanResult>
  StartInstall: (ids: string[]) => Promise<InstallState>
  StartUpgrade: (ids: string[]) => Promise<InstallState>
  StartUninstall: (ids: string[]) => Promise<InstallState>
  StartRepair: (ids: string[]) => Promise<InstallState>
  CancelInstall: () => Promise<InstallState>
  GetInstallState: () => Promise<InstallState>
  GetUpdates: (force: boolean) => Promise<UpdateReport>
  RefreshUpdates: () => Promise<UpdateReport>
  GetHistory: () => Promise<HistoryEntry[]>
  ClearHistory: () => Promise<void>
  GetHealth: (force: boolean) => Promise<HealthReport>
  GetHealthElevated: () => Promise<HealthReport>
  GetBatteryHealth: (force: boolean) => Promise<BatteryHealth>
  GetEventLog: (force: boolean) => Promise<EventLogReport>
  GetDiskUsage: (force: boolean) => Promise<DiskUsageReport>
  CleanDisk: (ids: string[]) => Promise<DiskCleanResult>
  GetWindowsUpdate: (force: boolean) => Promise<WindowsUpdateState>
  PauseWindowsUpdates: (days: number) => Promise<WindowsUpdateState>
  ResumeWindowsUpdates: () => Promise<WindowsUpdateState>
  SearchWinget: (query: string) => Promise<WingetSearchResult>
  InstallWingetPackage: (id: string, name: string) => Promise<InstallState>
  GetStartup: () => Promise<StartupReport>
  SetStartupEnabled: (id: string, enabled: boolean) => Promise<void>
  ExportProfile: (ids: string[], settings: Record<string, string>) => Promise<TransferResult>
  ImportProfile: () => Promise<ImportResult>
  ExportWinget: () => Promise<TransferResult>
  ImportWingetFile: () => Promise<ImportResult>
  OpenExternal: (url: string) => Promise<void>
  OpenDataFolder: () => Promise<void>
  GetVersion: () => Promise<string>
  GetAppUpdate: (force: boolean) => Promise<AppUpdateInfo>
  DownloadAppUpdate: () => Promise<AppUpdateDownload>
  RunAppUpdate: () => Promise<AppUpdateResult>
  InstallAppUpdate: (path: string) => Promise<AppUpdateResult>
  GetAppUpdateSettings: () => Promise<AppUpdateSettings>
  SetAppUpdateSettings: (autoCheck: boolean, autoDownload: boolean) => Promise<AppUpdateSettings>
  OpenUpdatesFolder: () => Promise<void>
  SetLanguage: (lang: string) => void
  Minimise: () => void
  ToggleMaximise: () => void
  Hide: () => void
  Quit: () => void
}

type WailsRuntime = {
  EventsOn: <T>(name: string, callback: (event: T) => void) => () => void
  EventsOff: (name: string) => void
  WindowMinimise: () => void
  WindowToggleMaximise: () => void
  WindowClose: () => void
}

declare global {
  interface Window {
    go?: {main: {App: WailsApp}}
    runtime?: WailsRuntime
  }
}

function wailsApp(): WailsApp | null {
  return window.go?.main?.App ?? null
}

export function isDesktop(): boolean {
  return Boolean(wailsApp())
}

function emptyState(): InstallState {
  return {
    active: false,
    cancelling: false,
    finished: false,
    items: [],
    success: false,
    cancelled: false,
    okCount: 0,
    failCount: 0,
    skippedCount: 0,
    baselineCount: 0,
    added: [],
    removed: [],
  }
}

const installedSeed: Record<string, string> = {
  'Google.Chrome': '141.0.7390.55',
  'Telegram.TelegramDesktop': '6.3.10',
  'VideoLAN.VLC': '3.0.21',
  '7zip.7zip': '25.01',
  'Microsoft.DirectX': '9.29',
  'Microsoft.VCRedist.2015+.x64': '14.44.35211',
  'Microsoft.VCRedist.2015+.x86': '14.44.35211',
  'Microsoft.DotNet.DesktopRuntime.8': '8.0.21',
  'Microsoft.EdgeWebView2Runtime': '155.0.4283.62',
  'Microsoft.WindowsTerminal': '1.23.12811',
  'Microsoft.PowerShell': '7.5.4',
  'Microsoft.VisualStudioCode': '1.105.1',
  'Git.Git': '2.52.0',
  'OpenJS.NodeJS.LTS': '24.13.0',
  'Discord.Discord': '1.0.9203',
  'Valve.Steam': '1.0.0.82',
  'Spotify.Spotify': '1.2.68',
  'Bitwarden.Bitwarden': '2026.9.1',
  'voidtools.Everything': '1.5.0.1396',
  'Obsidian.Obsidian': '1.9.14',
  'Microsoft.PowerToys': '0.96.1',
  'ShareX.ShareX': '17.0.0',
  'TheDocumentFoundation.LibreOffice': '25.8.2',
  'Notion.Notion': '4.5.1',
  'Figma.Figma': '126.4.6',
  'GIMP.GIMP': '3.0.6',
  'Brave.Brave': '1.83.107',
  'Microsoft.WSL': 'WSL 2',
  'Mozilla.Firefox': '144.0.1',
  'Docker.DockerDesktop': '4.48.0',
  'Postman.Postman': '12.8.3',
  'GitHub.GitHubDesktop': '3.5.2',
}

function mockScan(): ScanResult {
  const installed: ScanResult['installed'] = {}
  for (const [id, version] of Object.entries(installedSeed)) {
    const item = catalog.items.find((entry) => entry.id === id)
    if (!item) continue
    installed[id] = {
      id,
      name: item.name,
      version,
      publisher: item.publisher,
      source: version === 'WSL 2' || id.includes('VCRedist') || id.includes('DirectX') ? 'runtime' : 'registry',
    }
  }
  const checks = buildMockChecks(installed)
  return {
    scannedAt: new Date().toISOString(),
    durationMs: 214,
    installed,
    system: {
      osName: 'Windows 11 Pro',
      edition: 'Professional',
      version: '25H2',
      build: '26200.6901',
      arch: 'AMD64',
      hostname: 'STUDIO-01',
      username: 'misha',
      cpu: 'AMD Ryzen 7 7800X3D 8-Core Processor',
      cores: 16,
      gpu: ['NVIDIA GeForce RTX 4070'],
      ramTotalGb: 32,
      ramFreeGb: 18.4,
      diskTotalGb: 931,
      diskFreeGb: 412.7,
      diskLetter: 'C:',
      elevated: false,
      secureBoot: 'on',
      defender: 'on',
      webView2: '155.0.4283.62',
      winget: '1.29.380',
    },
    checks,
  }
}

function buildMockChecks(installed: ScanResult['installed']): SystemCheck[] {
  const runtimeIds = [
    ['Microsoft.DirectX', 'DirectX 9–11'],
    ['Microsoft.VCRedist.2015+.x64', 'Visual C++ x64'],
    ['Microsoft.VCRedist.2015+.x86', 'Visual C++ x86'],
    ['Microsoft.DotNet.DesktopRuntime.8', '.NET Desktop 8'],
    ['Microsoft.EdgeWebView2Runtime', 'WebView2'],
    ['Microsoft.WindowsTerminal', 'Windows Terminal'],
    ['Microsoft.PowerShell', 'PowerShell 7'],
    ['Microsoft.WSL', 'WSL'],
  ]
  const checks: SystemCheck[] = runtimeIds.map(([id, label]) => {
    const app = installed[id]
    return {
      id,
      label,
      kind: 'runtime',
      status: app ? 'ok' : 'missing',
      detail: app ? app.version : '',
    }
  })
  checks.push(
    {id: 'winget', label: 'winget package manager', detail: '1.29.380', status: 'ok', kind: 'system'},
    {id: 'secureboot', label: 'Secure Boot', detail: 'on', status: 'ok', kind: 'security'},
    {id: 'defender', label: 'Windows Security', detail: 'on', status: 'ok', kind: 'security'},
    {id: 'disk', label: 'Disk space', detail: '412.7 / 931 GB', status: 'ok', kind: 'system'},
    {id: 'memory', label: 'Memory', detail: '32 GB', status: 'ok', kind: 'system'},
    {id: 'network', label: 'winget connectivity', detail: 'ok', status: 'ok', kind: 'system'},
  )
  return checks
}

const listeners = new Set<(event: InstallEvent) => void>()
let mockState = emptyState()
let mockTimer: number | undefined

function emit(event: InstallEvent) {
  listeners.forEach((listener) => listener(event))
}

function baselineCatalogCount(): number {
  return catalog.items.filter((item) => installedSeed[item.id]).length
}

const updateSeed = [
  {id: 'VideoLAN.VLC', installed: '3.0.21', available: '3.0.22', source: 'winget'},
  {id: '7zip.7zip', installed: '25.01', available: '25.02', source: 'winget'},
  {id: 'Mozilla.Firefox', installed: '144.0.1', available: '145.0.1', source: 'winget'},
  {id: 'Bitwarden.Bitwarden', installed: '2026.9.1', available: '2026.10.0', source: 'winget'},
]

const mockUpgradedIds = new Set<string>()

function mockUpdateReport(): UpdateReport {
  const installedCount = baselineCatalogCount()
  const updates = updateSeed
    .filter((entry) => !mockUpgradedIds.has(entry.id))
    .map((entry) => {
      const item = catalog.items.find((candidate) => candidate.id === entry.id)
      return {
        id: entry.id,
        name: item?.name ?? entry.id,
        installed: entry.installed,
        available: entry.available,
        source: entry.source,
      }
    })
  return {
    checkedAt: new Date().toISOString(),
    durationMs: 1800,
    updates,
    installedCount,
    upToDate: Math.max(0, installedCount - updates.length),
  }
}

function startMockInstall(ids: string[], mode: InstallMode = 'install'): InstallState {
  if (mockTimer) window.clearTimeout(mockTimer)
  const items = ids.map((id) => {
    const item = catalog.items.find((entry) => entry.id === id)
    return {id, name: item?.name ?? id, status: 'pending' as const}
  })
  mockState = {
    active: true,
    cancelling: false,
    finished: false,
    startedAt: new Date().toISOString(),
    items,
    success: false,
    cancelled: false,
    mode,
    message: 'winget: awaiting UAC confirmation',
    okCount: 0,
    failCount: 0,
    skippedCount: 0,
    baselineCount: baselineCatalogCount(),
    added: [],
    removed: [],
  }
  emit({type: 'state', state: {...mockState, items: [...mockState.items]}})
  mockTimer = window.setTimeout(() => advanceMockInstall(), 850)
  return mockState
}

function advanceMockInstall() {
  if (!mockState.active) return
  if (mockState.cancelling) {
    finishMockInstall(true)
    return
  }
  const index = mockState.items.findIndex((item) => item.status === 'pending')
  if (index === -1) {
    finishMockInstall(false)
    return
  }
  mockState.items = mockState.items.map((item, i) => (i === index ? {...item, status: 'running'} : item))
  mockState.current = mockState.items[index].id
  mockState.message = `winget: ${mockState.mode ?? 'install'} in progress`
  emit({type: 'state', state: {...mockState, items: [...mockState.items]}})
  emit({type: 'log', line: `winget resolve ${mockState.items[index].name}`, state: mockState})
  mockTimer = window.setTimeout(() => {
    const mode = mockState.mode ?? 'install'
    mockState.items = mockState.items.map((item, i) => {
      if (i !== index) return item
      const note = mode === 'upgrade' ? 'upgraded' : mode === 'uninstall' ? 'removed' : mode === 'repair' ? 'repaired' : 'installed'
      const label = mode === 'upgrade' ? 'Оновлено' : mode === 'uninstall' ? 'Видалено' : mode === 'repair' ? 'Відновлено' : 'Встановлено'
      return {...item, status: 'ok' as const, note: note as InstallState['items'][number]['note'], message: label}
    })
    if (mode === 'uninstall') delete installedSeed[mockState.items[index].id]
    mockState.current = undefined
    emit({type: 'state', state: {...mockState, items: [...mockState.items]}})
    emit({
      type: 'log',
      line: `winget ${mode} ${mockState.items[index].name}: exit 0`,
      state: mockState,
    })
    mockTimer = window.setTimeout(() => advanceMockInstall(), 550)
  }, 1150)
}

function finishMockInstall(cancelled: boolean) {
  if (mockTimer) window.clearTimeout(mockTimer)
  const finishedItems = mockState.items.map((item) =>
    item.status === 'pending' ? {...item, status: 'skipped' as const, note: 'skipped' as const, message: 'Пропущено'} : item,
  )
  const ok = finishedItems.filter((item) => item.status === 'ok').length
  const failed = finishedItems.filter((item) => item.status === 'failed').length
  const skipped = finishedItems.filter((item) => item.status === 'skipped').length
  const mode = mockState.mode ?? 'install'
  if (mode === 'upgrade') {
    for (const item of finishedItems) {
      if (item.status === 'ok') mockUpgradedIds.add(item.id)
    }
  }
  const added =
    mode === 'install'
      ? finishedItems
          .filter((item) => item.status === 'ok')
          .map((item) => ({id: item.id, name: item.name}))
      : []
  const removed =
    mode === 'uninstall'
      ? finishedItems
          .filter((item) => item.status === 'ok')
          .map((item) => ({id: item.id, name: item.name}))
      : (mockState.removed ?? [])
  const baselineCount = mockState.baselineCount ?? 0
  const code = cancelled ? 'cancelled' : failed > 0 ? 'withErrors' : ok > 0 ? 'done' : 'noResult'
  mockState = {
    ...mockState,
    active: false,
    finished: true,
    finishedAt: new Date().toISOString(),
    cancelling: cancelled,
    cancelled,
    success: !cancelled && ok > 0 && failed === 0,
    current: undefined,
    message: `winget${mode !== 'install' ? ` ${mode}` : ''}: ok=${ok} failed=${failed} skipped=${skipped}`,
    code,
    okCount: ok,
    failCount: failed,
    skippedCount: skipped,
    baselineCount,
    added,
    removed,
    items: finishedItems,
  }
  const entry: HistoryEntry = {
    id: String(Date.now()),
    startedAt: mockState.startedAt ?? new Date().toISOString(),
    finishedAt: mockState.finishedAt ?? new Date().toISOString(),
    durationSec: Math.max(1, Math.round((Date.now() - new Date(mockState.startedAt ?? Date.now()).getTime()) / 1000)),
    status: cancelled ? 'cancelled' : failed > 0 ? 'failed' : 'success',
    message: mockState.message ?? '',
    code,
    mode,
    items: finishedItems.map((item) => ({id: item.id, name: item.name, status: item.status})),
    before: baselineCount,
    after: baselineCount + added.length - removed.length,
    newApps: added.map((change) => change.name),
  }
  const existing = mockHistory()
  localStorage.setItem('readywin.mockHistory', JSON.stringify([entry, ...existing].slice(0, 30)))
  emit({type: 'done', state: {...mockState, items: [...mockState.items]}})
}

function mockHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem('readywin.mockHistory')
    if (raw) return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
  const now = new Date()
  const sampleStart = new Date(now.getTime() - 1000 * 60 * 42)
  return [
    {
      id: 'sample',
      startedAt: sampleStart.toISOString(),
      finishedAt: new Date(sampleStart.getTime() + 1000 * 164).toISOString(),
      durationSec: 164,
      status: 'success',
      message: 'winget: ok=6 failed=0 skipped=0',
      code: 'done',
      items: [
        {id: 'Google.Chrome', name: 'Google Chrome', status: 'ok'},
        {id: '7zip.7zip', name: '7-Zip', status: 'ok'},
        {id: 'VideoLAN.VLC', name: 'VLC media player', status: 'ok'},
        {id: 'Telegram.TelegramDesktop', name: 'Telegram Desktop', status: 'ok'},
        {id: 'Bitwarden.Bitwarden', name: 'Bitwarden', status: 'ok'},
        {id: 'voidtools.Everything', name: 'Everything', status: 'ok'},
      ],
      before: 26,
      after: 32,
      newApps: ['7-Zip', 'Bitwarden', 'Everything'],
    },
  ]
}

function mockCatalogStatus(): CatalogStatus {
  return {
    source: 'embedded',
    version: catalog.version,
    updated: catalog.updated,
    itemCount: catalog.items.length,
    embeddedVersion: catalog.version,
    embeddedUpdated: catalog.updated,
    checkedAt: new Date().toISOString(),
  }
}

function mockHealth(): HealthReport {
  return {
    checkedAt: new Date().toISOString(),
    durationMs: 480,
    items: [
      {id: 'pendingReboot', status: 'ok'},
      {id: 'defender', status: 'ok', value: '1.439.88.0', detail: '2'},
      {id: 'firewall', status: 'ok', value: '3/3'},
      {id: 'bitlocker', status: 'warn', value: 'off'},
      {id: 'secureBoot', status: 'ok', value: 'on'},
      {id: 'activation', status: 'ok', value: 'licensed', detail: 'Windows 11 Pro'},
      {id: 'windowsUpdate', status: 'ok', value: 'KB5066835', detail: '2026-10-14T00:00:00Z'},
      {id: 'restorePoint', status: 'ok', value: '2026-10-18T09:12:00Z', detail: 'ReadyWin'},
      {id: 'battery', status: 'ok', value: '84', detail: '214'},
      {id: 'uptime', status: 'info', value: '3d 4h'},
      {id: 'memory', status: 'ok', value: '18.4 GB', detail: '32 GB'},
      {id: 'disk', status: 'ok', value: '412.7 GB', detail: '931 GB'},
    ],
    disks: [
      {name: 'Samsung SSD 990 PRO 1TB', media: 'SSD', health: 'Healthy', operational: 'OK', sizeGb: 931.5, wear: 3, temperature: 41},
      {name: 'WDC WD20EZBX-00AYRA0', media: 'HDD', health: 'Healthy', operational: 'OK', sizeGb: 1863, wear: 0, temperature: 34},
    ],
  }
}

let mockStartup: StartupEntry[] = [
  {
    id: 'reg|bW9jazE=',
    name: 'Steam',
    command: '"C:\\Program Files (x86)\\Steam\\steam.exe" -silent',
    location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    source: 'registry',
    scope: 'user',
    enabled: true,
    canToggle: true,
  },
  {
    id: 'reg|bW9jazI=',
    name: 'OneDrive',
    command: '"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background',
    location: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
    source: 'registry',
    scope: 'system',
    enabled: true,
    canToggle: true,
  },
  {
    id: 'folder|bW9jazM=',
    name: 'Bitwarden.lnk',
    command: 'C:\\Users\\misha\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\Bitwarden.lnk',
    location: 'Startup folder',
    source: 'folder',
    scope: 'user',
    enabled: false,
    canToggle: true,
  },
  {
    id: 'task|bW9jazQ=',
    name: 'Update Steam',
    command: 'C:\\Program Files (x86)\\Steam\\steam.exe -silent',
    location: '\\Steam\\Update Steam',
    source: 'task',
    scope: 'system',
    enabled: true,
    canToggle: true,
    state: 'Ready',
  },
]

function mockBattery(): BatteryHealth {
  return {
    present: true,
    charge: 76,
    status: 'charging',
    designMah: 57000,
    fullMah: 48200,
    healthPct: 84,
    cycles: 214,
    chemistry: 'Li-I',
    manufacturer: 'Example Cells',
  }
}

function mockEventLog(): EventLogReport {
  return {
    checkedAt: new Date().toISOString(),
    days: 7,
    total: 62,
    groups: [
      {
        source: 'Microsoft-Windows-WindowsUpdateClient',
        id: 20,
        level: 2,
        count: 6,
        last: '2026-10-23T18:48:13Z',
        message: 'Installation failed with error 0x80073D02.',
      },
      {
        source: 'Service Control Manager',
        id: 7009,
        level: 2,
        count: 4,
        last: '2026-10-22T12:29:15Z',
        message: 'Timeout (30000 ms) waiting for the Steam Client Service to connect.',
      },
      {
        source: 'BTHUSB',
        id: 5,
        level: 2,
        count: 3,
        last: '2026-10-24T13:21:57Z',
        message: 'The Bluetooth driver expected an HCI event of a certain size but did not receive it.',
      },
    ],
  }
}

const mockDiskSeed = [
  {id: 'userTemp', label: 'Temporary files', path: 'C:\\Users\\misha\\AppData\\Local\\Temp', safe: true, bytes: 1288490188, files: 4120},
  {id: 'windowsTemp', label: 'Windows temp', path: 'C:\\Windows\\Temp', safe: true, bytes: 402653184, files: 830},
  {id: 'windowsUpdate', label: 'Windows Update cache', path: 'C:\\Windows\\SoftwareDistribution\\Download', safe: true, bytes: 1717986918, files: 212},
  {id: 'deliveryOptimization', label: 'Delivery Optimization cache', path: 'C:\\Windows\\ServiceProfiles\\NetworkService\\AppData\\Local\\Microsoft\\Windows\\DeliveryOptimization\\Cache', safe: true, bytes: 734003200, files: 96},
  {id: 'crashDumps', label: 'Crash dumps', path: 'C:\\Users\\misha\\AppData\\Local\\CrashDumps', safe: true, bytes: 88080384, files: 3},
  {id: 'thumbnails', label: 'Thumbnail cache', path: 'C:\\Users\\misha\\AppData\\Local\\Microsoft\\Windows\\Explorer', safe: true, bytes: 24117248, files: 14},
  {id: 'downloads', label: 'Downloads', path: 'C:\\Users\\misha\\Downloads', safe: false, bytes: 12884901888, files: 1180},
  {id: 'desktop', label: 'Desktop', path: 'C:\\Users\\misha\\Desktop', safe: false, bytes: 3221225472, files: 240},
  {id: 'documents', label: 'Documents', path: 'C:\\Users\\misha\\Documents', safe: false, bytes: 5368709120, files: 860},
]
let mockDisk = mockDiskSeed.map((entry) => ({...entry, exists: true, children: []}))

function mockDiskUsage(): DiskUsageReport {
  return {
    checkedAt: new Date().toISOString(),
    diskTotalGb: 931,
    diskFreeGb: 412,
    scanMs: 1800,
    entries: mockDisk.map((entry) => ({...entry, children: []})),
  }
}

function mockWindowsUpdate(): WindowsUpdateState {
  return {
    checkedAt: new Date().toISOString(),
    edition: 'Windows 11 Pro',
    displayVersion: '24H2',
    build: '26100.2033',
    activation: 'licensed',
    licenseName: 'Windows(R), Professional edition',
    licenseKind: 'Retail',
    latestHotfix: 'KB5066835',
    hotfixDate: '2026-10-14T00:00:00Z',
    paused: false,
  }
}

const mockWingetCatalog = [
  {id: 'VideoLAN.VLC', name: 'VLC media player', version: '3.0.24'},
  {id: '7zip.7zip', name: '7-Zip', version: '24.09'},
  {id: 'Notepad++.Notepad++', name: 'Notepad++', version: '8.7.1'},
  {id: 'Git.Git', name: 'Git', version: '2.47.0'},
  {id: 'Python.Python.3.13', name: 'Python 3.13', version: '3.13.0'},
  {id: 'OBSProject.OBSStudio', name: 'OBS Studio', version: '31.0.0'},
  {id: 'Discord.Discord', name: 'Discord', version: '1.0.9170'},
  {id: 'Valve.Steam', name: 'Steam', version: '2.10.91.91'},
  {id: 'Bitwarden.Bitwarden', name: 'Bitwarden', version: '2024.11.2'},
]

export const bridge = {

  getCatalog: async (): Promise<Catalog> => {
    const app = wailsApp()
    return app ? app.GetCatalog() : catalog
  },
  getCatalogStatus: async (): Promise<CatalogStatus> => {
    const app = wailsApp()
    return app ? app.GetCatalogStatus() : mockCatalogStatus()
  },
  refreshCatalog: async (force: boolean): Promise<CatalogRefreshResult> => {
    const app = wailsApp()
    if (app) return app.RefreshCatalog(force)
    await new Promise((resolve) => window.setTimeout(resolve, 420))
    return {updated: false, catalog, status: mockCatalogStatus()}
  },
  scan: async (): Promise<ScanResult> => {
    const app = wailsApp()
    if (app) return app.Scan()
    await new Promise((resolve) => window.setTimeout(resolve, 620))
    return mockScan()
  },
  startInstall: async (ids: string[]): Promise<InstallState> => {
    const app = wailsApp()
    if (app) return app.StartInstall(ids)
    return startMockInstall(ids)
  },
  startUpgrade: async (ids: string[]): Promise<InstallState> => {
    const app = wailsApp()
    if (app) return app.StartUpgrade(ids)
    return startMockInstall(ids, 'upgrade')
  },
  startUninstall: async (ids: string[]): Promise<InstallState> => {
    const app = wailsApp()
    if (app) return app.StartUninstall(ids)
    return startMockInstall(ids, 'uninstall')
  },
  startRepair: async (ids: string[]): Promise<InstallState> => {
    const app = wailsApp()
    if (app) return app.StartRepair(ids)
    return startMockInstall(ids, 'repair')
  },
  getHealth: async (force: boolean): Promise<HealthReport> => {
    const app = wailsApp()
    if (app) return app.GetHealth(force)
    await new Promise((resolve) => window.setTimeout(resolve, force ? 620 : 180))
    return mockHealth()
  },
  getHealthElevated: async (): Promise<HealthReport> => {
    const app = wailsApp()
    if (app) return app.GetHealthElevated()
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    return {...mockHealth(), elevated: true}
  },
  getBatteryHealth: async (force: boolean): Promise<BatteryHealth> => {
    const app = wailsApp()
    if (app) return app.GetBatteryHealth(force)
    await new Promise((resolve) => window.setTimeout(resolve, force ? 400 : 120))
    return mockBattery()
  },
  getEventLog: async (force: boolean): Promise<EventLogReport> => {
    const app = wailsApp()
    if (app) return app.GetEventLog(force)
    await new Promise((resolve) => window.setTimeout(resolve, force ? 700 : 180))
    return mockEventLog()
  },
  getDiskUsage: async (force: boolean): Promise<DiskUsageReport> => {
    const app = wailsApp()
    if (app) return app.GetDiskUsage(force)
    await new Promise((resolve) => window.setTimeout(resolve, force ? 900 : 200))
    return mockDiskUsage()
  },
  cleanDisk: async (ids: string[]): Promise<DiskCleanResult> => {
    const app = wailsApp()
    if (app) return app.CleanDisk(ids)
    const selected = mockDisk.filter((entry) => entry.safe && ids.includes(entry.id))
    const freedBytes = selected.reduce((sum, entry) => sum + entry.bytes, 0)
    mockDisk = mockDisk.map((entry) => (ids.includes(entry.id) ? {...entry, bytes: 0, files: 0} : entry))
    return {freedBytes, removed: selected.length, failed: 0, needsAdmin: false}
  },
  getWindowsUpdate: async (force: boolean): Promise<WindowsUpdateState> => {
    const app = wailsApp()
    if (app) return app.GetWindowsUpdate(force)
    await new Promise((resolve) => window.setTimeout(resolve, force ? 500 : 150))
    return mockWindowsUpdate()
  },
  pauseWindowsUpdates: async (days: number): Promise<WindowsUpdateState> => {
    const app = wailsApp()
    if (app) return app.PauseWindowsUpdates(days)
    const until = new Date(Date.now() + days * 86400000).toISOString()
    return {...mockWindowsUpdate(), paused: true, pausedUntil: until, pauseDays: days}
  },
  resumeWindowsUpdates: async (): Promise<WindowsUpdateState> => {
    const app = wailsApp()
    if (app) return app.ResumeWindowsUpdates()
    return mockWindowsUpdate()
  },
  searchWinget: async (query: string): Promise<WingetSearchResult> => {
    const app = wailsApp()
    if (app) return app.SearchWinget(query)
    await new Promise((resolve) => window.setTimeout(resolve, 380))
    const needle = query.trim().toLowerCase()
    const results = needle.length < 2
      ? []
      : mockWingetCatalog.filter((item) => item.name.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle))
    return {query, checkedAt: new Date().toISOString(), results}
  },
  installWingetPackage: async (id: string, name: string): Promise<InstallState> => {
    const app = wailsApp()
    if (app) return app.InstallWingetPackage(id, name)
    return startMockInstall([id], 'install')
  },
  getStartup: async (): Promise<StartupReport> => {
    const app = wailsApp()
    if (app) return app.GetStartup()
    await new Promise((resolve) => window.setTimeout(resolve, 260))
    return {checkedAt: new Date().toISOString(), entries: mockStartup.map((entry) => ({...entry}))}
  },
  setStartupEnabled: async (id: string, enabled: boolean): Promise<void> => {
    const app = wailsApp()
    if (app) {
      await app.SetStartupEnabled(id, enabled)
      return
    }
    mockStartup = mockStartup.map((entry) => (entry.id === id ? {...entry, enabled, state: enabled ? 'Ready' : 'Disabled'} : entry))
  },
  exportProfile: async (ids: string[], settings: Record<string, string>): Promise<TransferResult> => {
    const app = wailsApp()
    if (!app) throw new Error('desktop only')
    return app.ExportProfile(ids, settings)
  },
  importProfile: async (): Promise<ImportResult> => {
    const app = wailsApp()
    if (!app) throw new Error('desktop only')
    return app.ImportProfile()
  },
  exportWinget: async (): Promise<TransferResult> => {
    const app = wailsApp()
    if (!app) throw new Error('desktop only')
    return app.ExportWinget()
  },
  importWingetFile: async (): Promise<ImportResult> => {
    const app = wailsApp()
    if (!app) throw new Error('desktop only')
    return app.ImportWingetFile()
  },
  getUpdates: async (force: boolean): Promise<UpdateReport> => {
    const app = wailsApp()
    if (app) return app.GetUpdates(force)
    await new Promise((resolve) => window.setTimeout(resolve, 640))
    return mockUpdateReport()
  },
  refreshUpdates: async (): Promise<UpdateReport> => {
    const app = wailsApp()
    if (app) return app.RefreshUpdates()
    await new Promise((resolve) => window.setTimeout(resolve, 640))
    return mockUpdateReport()
  },
  cancelInstall: async (): Promise<InstallState> => {
    const app = wailsApp()
    if (app) return app.CancelInstall()
    if (mockState.active) {
      mockState = {...mockState, cancelling: true, message: 'winget: cancel requested'}
      emit({type: 'state', state: {...mockState, items: [...mockState.items]}})
    }
    return mockState
  },
  getInstallState: async (): Promise<InstallState> => {
    const app = wailsApp()
    return app ? app.GetInstallState() : mockState
  },
  getHistory: async (): Promise<HistoryEntry[]> => {
    const app = wailsApp()
    if (app) return app.GetHistory()
    return mockHistory()
  },
  clearHistory: async (): Promise<void> => {
    const app = wailsApp()
    if (app) {
      await app.ClearHistory()
      return
    }
    localStorage.setItem('readywin.mockHistory', '[]')
  },
  openDataFolder: async (): Promise<void> => {
    const app = wailsApp()
    if (app) await app.OpenDataFolder()
  },
  openExternal: async (url: string): Promise<void> => {
    const app = wailsApp()
    if (app) {
      await app.OpenExternal(url)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  getVersion: async (): Promise<string> => {
    const app = wailsApp()
    return app ? app.GetVersion() : '1.2.0'
  },
  getAppUpdate: async (force: boolean): Promise<AppUpdateInfo> => {
    const app = wailsApp()
    if (app) return app.GetAppUpdate(force)
    return {
      currentVersion: '1.2.0',
      latestVersion: '1.2.0',
      available: false,
      checkedAt: new Date().toISOString(),
    }
  },
  downloadAppUpdate: async (): Promise<AppUpdateDownload> => {
    const app = wailsApp()
    if (app) return app.DownloadAppUpdate()
    throw new Error('demo')
  },
  runAppUpdate: async (): Promise<AppUpdateResult> => {
    const app = wailsApp()
    if (app) return app.RunAppUpdate()
    throw new Error('demo')
  },
  installAppUpdate: async (path: string): Promise<AppUpdateResult> => {
    const app = wailsApp()
    if (app) return app.InstallAppUpdate(path)
    throw new Error('demo')
  },
  getAppUpdateSettings: async (): Promise<AppUpdateSettings> => {
    const app = wailsApp()
    if (app) return app.GetAppUpdateSettings()
    return {autoCheck: true, autoDownload: true}
  },
  setAppUpdateSettings: async (autoCheck: boolean, autoDownload: boolean): Promise<AppUpdateSettings> => {
    const app = wailsApp()
    if (app) return app.SetAppUpdateSettings(autoCheck, autoDownload)
    return {autoCheck, autoDownload}
  },
  openUpdatesFolder: async (): Promise<void> => {
    const app = wailsApp()
    if (app) await app.OpenUpdatesFolder()
  },
  onAppUpdateProgress: (callback: (progress: AppUpdateProgress) => void): (() => void) => {
    if (window.runtime) return window.runtime.EventsOn('appupdate:progress', callback)
    return () => undefined
  },
  onAppUpdateAvailable: (callback: (info: AppUpdateInfo) => void): (() => void) => {
    if (window.runtime) return window.runtime.EventsOn('appupdate:available', callback)
    return () => undefined
  },
  onAppUpdateReady: (callback: (download: AppUpdateDownload) => void): (() => void) => {
    if (window.runtime) return window.runtime.EventsOn('appupdate:ready', callback)
    return () => undefined
  },
  onAppUpdateDownloadError: (callback: (message: string) => void): (() => void) => {
    if (window.runtime) return window.runtime.EventsOn('appupdate:downloadError', callback)
    return () => undefined
  },
  setLanguage: (lang: string) => {
    wailsApp()?.SetLanguage?.(lang)
  },
  onInstallEvent: (callback: (event: InstallEvent) => void): (() => void) => {
    if (window.runtime) {
      return window.runtime.EventsOn('install:event', callback)
    }
    listeners.add(callback)
    // Fall back to polling the bound state when the injected runtime script is missing.
    let timer = 0
    const app = wailsApp()
    let wasFinished = false
    if (app) {
      timer = window.setInterval(() => {
        void app
          .GetInstallState()
          .then((state) => {
            for (const listener of listeners) listener({type: 'state', state})
            if (state.finished && !wasFinished) {
              wasFinished = true
              for (const listener of listeners) listener({type: 'done', state})
            }
            if (!state.active && !state.finished) wasFinished = false
          })
          .catch(() => undefined)
      }, 700)
    }
    return () => {
      listeners.delete(callback)
      if (timer) window.clearInterval(timer)
    }
  },
  minimise: () => {
    if (window.runtime?.WindowMinimise) {
      window.runtime.WindowMinimise()
      return
    }
    wailsApp()?.Minimise?.()
  },
  toggleMaximise: () => {
    if (window.runtime?.WindowToggleMaximise) {
      window.runtime.WindowToggleMaximise()
      return
    }
    wailsApp()?.ToggleMaximise?.()
  },
  close: () => {
    if (window.runtime?.WindowClose) {
      window.runtime.WindowClose()
      return
    }
    wailsApp()?.Quit?.()
  },
}

export {catalog as embeddedCatalog}
