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

export type InstallItem = {
  id: string
  name: string
  status: 'pending' | 'running' | 'ok' | 'failed' | 'skipped'
  exitCode?: number
  message?: string
  /** 'installed' | 'already' | 'upgraded' | 'uptodate' | 'restart' | 'skipped' | 'failed' */
  note?: 'installed' | 'already' | 'upgraded' | 'uptodate' | 'restart' | 'skipped' | 'failed'
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
  /** 'done' | 'withErrors' | 'noResult' | 'noLog' | 'uacCancelled' | 'cancelled' */
  code?: string
  /** 'install' | 'upgrade' */
  mode?: 'install' | 'upgrade'
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
  items: HistoryItem[]
  before: number
  after: number
  newApps: string[]
}

export type Page = 'overview' | 'catalog' | 'system' | 'history'
