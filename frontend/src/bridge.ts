import catalogJson from '../../shared/catalog.json'
import type {
  Catalog,
  HistoryEntry,
  InstallEvent,
  InstallState,
  ScanResult,
  SystemCheck,
  UpdateReport,
} from './types'

const catalog = catalogJson as Catalog

type InstallMode = 'install' | 'upgrade'

type WailsApp = {
  GetCatalog: () => Promise<Catalog>
  Scan: () => Promise<ScanResult>
  StartInstall: (ids: string[]) => Promise<InstallState>
  StartUpgrade: (ids: string[]) => Promise<InstallState>
  CancelInstall: () => Promise<InstallState>
  GetInstallState: () => Promise<InstallState>
  GetUpdates: (force: boolean) => Promise<UpdateReport>
  RefreshUpdates: () => Promise<UpdateReport>
  GetHistory: () => Promise<HistoryEntry[]>
  ClearHistory: () => Promise<void>
  OpenExternal: (url: string) => Promise<void>
  OpenDataFolder: () => Promise<void>
  GetVersion: () => Promise<string>
  Minimise: () => void
  ToggleMaximise: () => void
  Hide: () => void
  Quit: () => void
}

type WailsRuntime = {
  EventsOn: (name: string, callback: (event: InstallEvent) => void) => () => void
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
  mockState.message = mockState.mode === 'upgrade' ? 'winget: upgrade in progress' : 'winget: install in progress'
  emit({type: 'state', state: {...mockState, items: [...mockState.items]}})
  emit({type: 'log', line: `winget resolve ${mockState.items[index].name}`, state: mockState})
  mockTimer = window.setTimeout(() => {
    mockState.items = mockState.items.map((item, i) => {
      if (i !== index) return item
      if (mockState.mode === 'upgrade') {
        return {...item, status: 'ok' as const, note: 'upgraded' as const, message: 'Оновлено'}
      }
      return {...item, status: 'ok' as const, note: 'installed' as const, message: 'Встановлено'}
    })
    mockState.current = undefined
    emit({type: 'state', state: {...mockState, items: [...mockState.items]}})
    emit({
      type: 'log',
      line: `winget ${mockState.mode === 'upgrade' ? 'upgrade' : 'install'} ${mockState.items[index].name}: exit 0`,
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
  const upgraded = mockState.mode === 'upgrade'
  if (upgraded) {
    for (const item of finishedItems) {
      if (item.status === 'ok') mockUpgradedIds.add(item.id)
    }
  }
  const added = upgraded
    ? []
    : finishedItems
        .filter((item) => item.status === 'ok')
        .map((item) => ({id: item.id, name: item.name}))
  const removed = mockState.removed ?? []
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
    message: `winget${upgraded ? ' upgrade' : ''}: ok=${ok} failed=${failed} skipped=${skipped}`,
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

export const bridge = {
  getCatalog: async (): Promise<Catalog> => {
    const app = wailsApp()
    return app ? app.GetCatalog() : catalog
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
    return app ? app.GetVersion() : '1.0.0'
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
