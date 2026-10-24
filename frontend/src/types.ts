export type Group = {
  id: string
  name: string
  nameEn?: string
  description: string
  descriptionEn?: string
  index: number
}

export type Preset = {
  id: string
  name: string
  nameEn?: string
  description: string
  descriptionEn?: string
  items: string[]
}

export type Item = {
  id: string
  name: string
  shortName: string
  publisher: string
  description: string
  descriptionEn?: string
  homepage?: string
  group: string
  icon: string
  tags: string[]
  sizeMb: number
  recommended: boolean
  note?: string
  match: string[]
}

export type Catalog = {
  version: string
  updated: string
  groups: Group[]
  presets: Preset[]
  items: Item[]
}

export type InstalledApp = {
  id: string
  name: string
  version: string
  publisher: string
  /** 'registry' | 'store' | 'runtime' */
  source: string
  location?: string
}

export type SystemCheck = {
  id: string
  label: string
  detail: string
  status: 'ok' | 'warn' | 'missing'
  kind: 'runtime' | 'system' | 'security'
}

export type SystemInfo = {
  osName: string
  edition: string
  version: string
  build: string
  arch: string
  hostname: string
  username: string
  cpu: string
  cores: number
  gpu: string[]
  ramTotalGb: number
  ramFreeGb: number
  diskTotalGb: number
  diskFreeGb: number
  diskLetter: string
  elevated: boolean
  secureBoot: string
  defender: string
  webView2: string
  winget: string
}

export type ScanResult = {
  scannedAt: string
  durationMs: number
  installed: Record<string, InstalledApp>
  system: SystemInfo
  checks: SystemCheck[]
}

export type InstallMode = 'install' | 'upgrade' | 'uninstall' | 'repair'

export type InstallNote =
  | 'installed'
  | 'already'
  | 'upgraded'
  | 'uptodate'
  | 'removed'
  | 'repaired'
  | 'notinstalled'
  | 'restart'
  | 'skipped'
  | 'failed'

export type InstallItem = {
  id: string
  name: string
  status: 'pending' | 'running' | 'ok' | 'failed' | 'skipped'
  exitCode?: number
  message?: string
  note?: InstallNote
}

export type UpdateInfo = {
  id: string
  name: string
  installed?: string
  available?: string
  source?: string
}

export type UpdateReport = {
  checkedAt: string
  durationMs: number
  updates: UpdateInfo[]
  installedCount: number
  upToDate: number
  error?: string
}

export type AppUpdateInfo = {
  currentVersion: string
  latestVersion?: string
  available: boolean
  releaseName?: string
  releaseUrl?: string
  downloadUrl?: string
  downloadSize?: number
  checksum?: string
  notes?: string
  publishedAt?: string
  checkedAt: string
  error?: string
}

export type AppUpdateDownload = {
  path: string
  sha256: string
  size: number
}

export type AppUpdateProgress = {
  downloaded: number
  total: number
  percent: number
  done: boolean
  error?: string
}

export type AppUpdateResult = {
  status: 'applying' | 'installed' | 'failed'
  version?: string
  previous?: string
  message?: string
  at?: string
  elevated?: boolean
}

export type AppUpdateSettings = {
  autoCheck: boolean
  autoDownload: boolean
  lastCheck?: string
  lastResult?: AppUpdateResult
}

export type InstalledChange = {
  id: string
  name: string
  version?: string
}

export type InstallState = {
  active: boolean
  cancelling: boolean
  finished: boolean
  startedAt?: string
  finishedAt?: string
  items: InstallItem[]
  current?: string
  success: boolean
  cancelled: boolean
  message?: string
  /** 'done' | 'withErrors' | 'noResult' | 'noLog' | 'uacCancelled' | 'launcherFailed' | 'cancelled' */
  code?: string
  mode?: InstallMode
  okCount: number
  failCount: number
  skippedCount: number
  baselineCount: number
  added: InstalledChange[]
  removed: InstalledChange[]
}

export type InstallEvent = {
  type: 'state' | 'log' | 'done'
  state: InstallState
  line?: string
}

export type HistoryItem = {
  id: string
  name: string
  status: string
  exitCode?: number
  message?: string
}

export type HistoryEntry = {
  id: string
  startedAt: string
  finishedAt: string
  durationSec: number
  status: 'success' | 'failed' | 'cancelled'
  message: string
  code?: string
  mode?: InstallMode
  items: HistoryItem[]
  before: number
  after: number
  newApps: string[]
}

export type HealthStatus = 'ok' | 'warn' | 'bad' | 'unknown' | 'info' | 'na'

export type HealthItem = {
  id: string
  status: HealthStatus
  value?: string
  detail?: string
}

export type DiskHealth = {
  name: string
  media?: string
  health?: string
  operational?: string
  sizeGb: number
  wear?: number
  temperature?: number
}

export type HealthReport = {
  checkedAt: string
  durationMs: number
  items: HealthItem[]
  disks: DiskHealth[]
  elevated?: boolean
  elevatedError?: string
  error?: string
}

export type StartupEntry = {
  id: string
  name: string
  command: string
  location: string
  /** 'registry' | 'folder' | 'task' */
  source: string
  /** 'user' | 'system' */
  scope: string
  enabled: boolean
  canToggle: boolean
  state?: string
}

export type StartupReport = {
  checkedAt: string
  entries: StartupEntry[]
  error?: string
}

export type CatalogStatus = {
  source: string
  version: string
  updated: string
  itemCount: number
  embeddedVersion: string
  embeddedUpdated: string
  checkedAt?: string
  error?: string
}

export type CatalogRefreshResult = {
  updated: boolean
  catalog: Catalog
  status: CatalogStatus
}

export type TransferResult = {
  cancelled: boolean
  path?: string
  count: number
}

export type ImportResult = {
  cancelled: boolean
  path?: string
  apps: string[]
  unknown: string[]
  settings?: Record<string, string>
}

export type Page = 'overview' | 'catalog' | 'health' | 'system' | 'history' | 'settings'

export type BatteryHealth = {
  present: boolean
  charge?: number
  /** 'discharging' | 'ac' | 'charging' | 'full' | 'partial' | 'unknown' */
  status?: string
  designMah?: number
  fullMah?: number
  healthPct?: number
  cycles?: number
  chemistry?: string
  runtimeMin?: number
  manufacturer?: string
  serial?: string
  message?: string
}

export type EventLogGroup = {
  source: string
  id: number
  level: number
  count: number
  last: string
  message: string
}

export type EventLogReport = {
  checkedAt: string
  days: number
  total: number
  groups: EventLogGroup[]
  error?: string
}

export type DiskChild = {
  name: string
  path: string
  dir: boolean
  bytes: number
}

export type DiskUsageEntry = {
  id: string
  label: string
  path: string
  safe: boolean
  exists: boolean
  bytes: number
  files: number
  children?: DiskChild[]
  truncated?: boolean
  error?: string
}

export type DiskUsageReport = {
  checkedAt: string
  diskTotalGb: number
  diskFreeGb: number
  entries: DiskUsageEntry[]
  scanMs: number
  error?: string
}

export type DiskCleanResult = {
  freedBytes: number
  removed: number
  failed: number
  needsAdmin: boolean
  errors?: string[]
}

export type WindowsUpdateState = {
  checkedAt: string
  edition?: string
  displayVersion?: string
  build?: string
  /** 'licensed' | 'unlicensed' */
  activation?: string
  licenseName?: string
  licenseKind?: string
  licenseDays?: number
  latestHotfix?: string
  hotfixDate?: string
  paused: boolean
  pausedUntil?: string
  pauseDays?: number
  error?: string
}

export type WingetResult = {
  id: string
  name: string
  version: string
  match?: string
  source?: string
}

export type WingetSearchResult = {
  query: string
  checkedAt: string
  results: WingetResult[]
  error?: string
}
