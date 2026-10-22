import {useCallback, useEffect, useRef, useState} from 'react'
import './App.css'
import {bridge, embeddedCatalog, isDesktop} from './bridge'
import type {
  AppUpdateDownload,
  AppUpdateInfo,
  AppUpdateProgress,
  Catalog,
  CatalogStatus,
  HistoryEntry,
  InstallEvent,
  InstallMode,
  InstallState,
  Item,
  Page,
  ScanResult,
  UpdateReport,
} from './types'
import {useI18n} from './i18n'
import type {Lang} from './i18n'
import {Titlebar} from './components/Titlebar'
import {Sidebar} from './components/Sidebar'
import {QueueDrawer} from './components/QueueDrawer'
import {ItemDialog} from './components/ItemDialog'
import {IconCheck, IconDownload, IconInfo, IconX} from './uiIcons'
import {Overview} from './pages/Overview'
import {Catalog as CatalogPage} from './pages/Catalog'
import {SystemPage} from './pages/System'
import {HealthPage} from './pages/Health'
import {HistoryPage} from './pages/History'

type StatusFilter = 'all' | 'missing' | 'installed' | 'updates'

const SKIP_UPDATE_KEY = 'readywin.skipUpdateVersion'

function initialTheme(): 'light' | 'dark' {
  const saved =
    localStorage.getItem('readywin.theme') ?? localStorage.getItem('firstwin.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const {t, tn, lang, setLang} = useI18n()
  const [catalog, setCatalog] = useState<Catalog>(embeddedCatalog)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [version, setVersion] = useState('1.0.0')
  const [page, setPage] = useState<Page>('overview')
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const [maximized, setMaximized] = useState(false)

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [queue, setQueue] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)

  const [installState, setInstallState] = useState<InstallState | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [resultDismissed, setResultDismissed] = useState(false)
  const [toast, setToast] = useState<{id: number; message: string} | null>(null)
  const [updates, setUpdates] = useState<UpdateReport | null>(null)
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus | null>(null)
  const [catalogRefreshing, setCatalogRefreshing] = useState(false)
  const [appUpdate, setAppUpdate] = useState<AppUpdateInfo | null>(null)
  const [appUpdateLoading, setAppUpdateLoading] = useState(false)
  const [appUpdateDismissed, setAppUpdateDismissed] = useState(false)
  const [appUpdateDownload, setAppUpdateDownload] = useState<AppUpdateDownload | null>(null)
  const [appUpdateProgress, setAppUpdateProgress] = useState<AppUpdateProgress | null>(null)
  const [appUpdateDownloading, setAppUpdateDownloading] = useState(false)
  const [skippedVersion, setSkippedVersion] = useState(() => localStorage.getItem(SKIP_UPDATE_KEY) ?? '')

  const searchRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const updatesPrimed = useRef(false)

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({id: Date.now(), message})
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const refreshScan = useCallback(async () => {
    setScanning(true)
    try {
      const result = await bridge.scan()
      setScan(result)
    } catch {
      showToast(t('toast.scanFail'))
    } finally {
      setScanning(false)
    }
  }, [showToast, t])

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await bridge.getHistory())
    } catch {
      // History is auxiliary; keep the previous list on failure.
    }
  }, [])

  const refreshUpdates = useCallback(async (force: boolean) => {
    setUpdatesLoading(true)
    try {
      const report = force ? await bridge.refreshUpdates() : await bridge.getUpdates(false)
      setUpdates(report)
    } catch (error) {
      // A failing winget must not break the app: surface it inside the panel.
      setUpdates({
        checkedAt: new Date().toISOString(),
        durationMs: 0,
        updates: [],
        installedCount: 0,
        upToDate: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setUpdatesLoading(false)
    }
  }, [])

  const refreshCatalog = useCallback(async (force: boolean, silent = false) => {
    setCatalogRefreshing(true)
    try {
      const result = await bridge.refreshCatalog(force)
      setCatalog(result.catalog)
      setCatalogStatus(result.status)
      if (!silent) showToast(result.updated ? t('toast.catalogUpdated') : t('toast.catalogCurrent'))
    } catch (error) {
      setCatalogStatus((previous) =>
        previous ? {...previous, error: error instanceof Error ? error.message : String(error)} : previous,
      )
      if (!silent) showToast(t('toast.catalogFail'))
    } finally {
      setCatalogRefreshing(false)
    }
  }, [showToast, t])

  const checkAppUpdate = useCallback(async (force: boolean) => {
    setAppUpdateLoading(true)
    try {
      const result = await bridge.getAppUpdate(force)
      setAppUpdate(result)
      if (result.latestVersion !== appUpdate?.latestVersion) {
        setAppUpdateDownload(null)
        setAppUpdateProgress(null)
      }
      if (result.available && result.latestVersion !== skippedVersion) setAppUpdateDismissed(false)
      if (force) {
        showToast(
          result.available
            ? t('toast.appUpdateAvailable', {version: result.latestVersion ?? ''})
            : result.error
              ? t('toast.appUpdateFail')
              : t('toast.appUpdateCurrent'),
        )
      }
    } catch {
      if (force) showToast(t('toast.appUpdateFail'))
    } finally {
      setAppUpdateLoading(false)
    }
  }, [appUpdate, skippedVersion, showToast, t])

  const openAppUpdate = async () => {
    const target = appUpdate?.releaseUrl
    if (!target) return
    try {
      await bridge.openExternal(target)
    } catch {
      showToast(t('toast.openFail'))
    }
  }

  const downloadAppUpdate = async () => {
    if (!appUpdate?.available) return
    setAppUpdateDownloading(true)
    setAppUpdateDownload(null)
    setAppUpdateProgress({
      downloaded: 0,
      total: appUpdate.downloadSize ?? 0,
      percent: 0,
      done: false,
    })
    try {
      const result = await bridge.downloadAppUpdate()
      setAppUpdateDownload(result)
      setAppUpdateProgress({
        downloaded: result.size,
        total: result.size,
        percent: 100,
        done: true,
      })
      showToast(t('toast.updateDownloaded'))
    } catch {
      showToast(t('toast.updateDownloadFail'))
    } finally {
      setAppUpdateDownloading(false)
    }
  }

  const launchAppUpdate = async () => {
    if (!appUpdateDownload) return
    try {
      await bridge.launchAppUpdate(appUpdateDownload.path)
    } catch {
      showToast(t('toast.updateInstallFail'))
    }
  }

  const skipAppUpdate = () => {
    const version = appUpdate?.latestVersion
    if (!version) return
    localStorage.setItem(SKIP_UPDATE_KEY, version)
    setSkippedVersion(version)
    setAppUpdateDismissed(true)
    showToast(t('toast.updateSkipped', {version}))
  }

  const unskipAppUpdate = () => {
    localStorage.removeItem(SKIP_UPDATE_KEY)
    setSkippedVersion('')
    setAppUpdateDismissed(false)
  }

  useEffect(() => bridge.onAppUpdateProgress((progress) => setAppUpdateProgress(progress)), [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('readywin.theme', theme)
  }, [theme])

  useEffect(() => {
    bridge.setLanguage(lang)
  }, [lang])

  useEffect(() => {
    let alive = true
    void bridge.getCatalog().then((value) => {
      if (alive) setCatalog(value)
    }).catch(() => undefined)
    void bridge.getCatalogStatus().then((value) => {
      if (alive) setCatalogStatus(value)
    }).catch(() => undefined)
    void bridge.refreshCatalog(false).then((result) => {
      if (!alive) return
      setCatalog(result.catalog)
      setCatalogStatus(result.status)
    }).catch(() => undefined)
    void bridge.getInstallState().then((state) => {
      if (!alive) return
      if (state.active || state.finished) {
        setInstallState(state)
        if (state.active) setDrawerOpen(true)
      }
    }).catch(() => undefined)
    void bridge.getVersion().then((value) => {
      if (alive) setVersion(value)
    }).catch(() => undefined)
    void bridge.getAppUpdate(false).then((value) => {
      if (alive) setAppUpdate(value)
    }).catch(() => undefined)
    void refreshHistory()
    void refreshScan()
    return () => {
      alive = false
    }
  }, [refreshHistory, refreshScan])

  useEffect(() => {
    let cancelledIds: string[] = []
    const off = bridge.onInstallEvent((event: InstallEvent) => {
      setInstallState(event.state)
      if (event.line) {
        setLogs((previous) => [...previous.slice(-240), event.line as string])
      }
      if (event.type === 'done') {
        cancelledIds = event.state.items
          .filter((item) => item.status === 'ok')
          .map((item) => item.id)
        setQueue((previous) => previous.filter((id) => !cancelledIds.includes(id)))
        setResultDismissed(false)
        void refreshScan()
        void refreshHistory()
        void refreshUpdates(true)
      }
    })
    return () => {
      off()
    }
  }, [refreshHistory, refreshScan, refreshUpdates])

  // One background check right after the first system scan; the panel shows the result when ready.
  useEffect(() => {
    if (!scan || updatesPrimed.current) return
    updatesPrimed.current = true
    void refreshUpdates(false)
  }, [scan, refreshUpdates])

  useEffect(() => {
    if (!scan) return
    const installed = scan.installed
    setQueue((previous) => {
      const next = previous.filter((id) => !installed[id])
      return next.length === previous.length ? previous : next
    })
  }, [scan])

  const goSearch = useCallback(() => {
    setPage('catalog')
    window.setTimeout(() => searchRef.current?.focus(), 70)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = Boolean(
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable),
      )
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        goSearch()
        return
      }
      if (event.key === '/' && !typing) {
        event.preventDefault()
        goSearch()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        void refreshScan()
        return
      }
      if (event.key === 'Escape') {
        if (selected) setSelected(null)
        else if (drawerOpen) {
          setDrawerOpen(false)
          if (installState?.finished) setResultDismissed(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, goSearch, installState, refreshScan, selected])

  const navigate = (next: Page) => {
    setPage(next)
    mainRef.current?.scrollTo({top: 0, behavior: 'smooth'})
  }

  const installedSet = new Set(Object.keys(scan?.installed ?? {}))
  const installedCount = catalog.items.filter((item) => installedSet.has(item.id)).length

  const addToQueue = (id: string) => {
    if (installedSet.has(id) || queue.includes(id)) return
    const item = catalog.items.find((entry) => entry.id === id)
    setQueue((previous) => [...previous, id])
    if (item) showToast(t('toast.queued', {name: item.shortName}))
  }

  const addMany = (ids: string[]) => {
    const fresh = ids.filter((id) => !installedSet.has(id) && !queue.includes(id))
    if (fresh.length === 0) {
      showToast(t('toast.allAdded'))
      return
    }
    setQueue((previous) => [...previous, ...fresh])
    showToast(t('toast.added', {count: fresh.length, noun: tn('noun.programs', fresh.length)}))
  }

  const removeFromQueue = (id: string) => {
    setQueue((previous) => previous.filter((entry) => entry !== id))
  }

  const startMode = async (mode: InstallMode, ids: string[]) => {
    if (ids.length === 0) return
    setLogs([])
    setInstallState(null)
    setResultDismissed(false)
    setDrawerOpen(true)
    try {
      const state =
        mode === 'upgrade'
          ? await bridge.startUpgrade(ids)
          : mode === 'uninstall'
            ? await bridge.startUninstall(ids)
            : mode === 'repair'
              ? await bridge.startRepair(ids)
              : await bridge.startInstall(ids)
      setInstallState(state)
    } catch {
      showToast(
        mode === 'upgrade'
          ? t('toast.upgradeFail')
          : mode === 'uninstall'
            ? t('toast.uninstallFail')
            : mode === 'repair'
              ? t('toast.repairFail')
              : t('toast.installFail'),
      )
    }
  }

  const startInstall = (ids: string[] = queue) => {
    void startMode('install', ids)
  }

  const startUpgrade = (ids: string[]) => {
    void startMode('upgrade', ids)
  }

  const namesFor = (ids: string[]) =>
    ids
      .map((id) => catalog.items.find((entry) => entry.id === id)?.shortName ?? id)
      .slice(0, 3)
      .join(', ')

  const startUninstall = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!window.confirm(t('dlg.uninstallConfirm', {name: namesFor(ids)}))) return
    await startMode('uninstall', ids)
  }

  const startRepair = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!window.confirm(t('dlg.repairConfirm', {name: namesFor(ids)}))) return
    await startMode('repair', ids)
  }

  const enqueueImported = (apps: string[], unknown: string[]) => {
    const fresh = apps.filter((id) => !installedSet.has(id) && !queue.includes(id))
    if (fresh.length === 0) {
      showToast(t('toast.importEmpty'))
      return
    }
    setQueue((previous) => [...previous, ...fresh])
    showToast(
      unknown.length > 0
        ? t('toast.importedUnknown', {count: fresh.length, unknown: unknown.length})
        : t('toast.imported', {count: fresh.length}),
    )
  }

  const applyImportedSettings = (settings?: Record<string, string>) => {
    if (!settings) return
    if (settings.theme === 'light' || settings.theme === 'dark') setTheme(settings.theme)
    const importedLang = settings.lang
    if (importedLang === 'uk' || importedLang === 'en' || importedLang === 'de' || importedLang === 'ru') {
      setLang(importedLang as Lang)
    }
  }

  const exportProfile = async (kind: 'selected' | 'installed') => {
    if (!isDesktop()) {
      showToast(t('toast.noDesktop'))
      return
    }
    const ids =
      kind === 'selected'
        ? queue
        : catalog.items.filter((item) => installedSet.has(item.id)).map((item) => item.id)
    if (ids.length === 0) {
      showToast(t('toast.importEmpty'))
      return
    }
    try {
      const result = await bridge.exportProfile(ids, {theme, lang})
      if (result.cancelled) return
      showToast(t('toast.exported', {count: result.count}))
    } catch {
      showToast(t('toast.exportFail'))
    }
  }

  const importProfile = async () => {
    if (!isDesktop()) {
      showToast(t('toast.noDesktop'))
      return
    }
    try {
      const result = await bridge.importProfile()
      if (result.cancelled) return
      applyImportedSettings(result.settings)
      enqueueImported(result.apps, result.unknown)
    } catch {
      showToast(t('toast.importFail'))
    }
  }

  const exportWinget = async () => {
    if (!isDesktop()) {
      showToast(t('toast.noDesktop'))
      return
    }
    try {
      const result = await bridge.exportWinget()
      if (result.cancelled) return
      showToast(t('toast.exported', {count: result.count}))
    } catch {
      showToast(t('toast.exportFail'))
    }
  }

  const importWinget = async () => {
    if (!isDesktop()) {
      showToast(t('toast.noDesktop'))
      return
    }
    try {
      const result = await bridge.importWingetFile()
      if (result.cancelled) return
      enqueueImported(result.apps, result.unknown)
    } catch {
      showToast(t('toast.importFail'))
    }
  }

  const cancelInstall = async () => {
    try {
      setInstallState(await bridge.cancelInstall())
    } catch {
      showToast(t('toast.cancelFail'))
    }
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    if (installState?.finished) setResultDismissed(true)
  }

  const openDataFolder = async () => {
    if (!isDesktop()) {
      showToast(t('toast.noDesktop'))
      return
    }
    try {
      await bridge.openDataFolder()
    } catch {
      showToast(t('toast.openFail'))
    }
  }

  const clearHistory = async () => {
    try {
      await bridge.clearHistory()
      setHistory([])
      showToast(t('toast.historyCleared'))
    } catch {
      showToast(t('toast.historyClearFail'))
    }
  }

  const toggleMaximise = () => {
    setMaximized((value) => !value)
    bridge.toggleMaximise()
  }

  const showResult = Boolean(
    installState && (installState.active || (installState.finished && !resultDismissed)),
  )

  return (
    <div className="app-shell">
      <Titlebar
        page={page}
        maximized={maximized}
        onMinimise={() => bridge.minimise()}
        onToggleMaximise={toggleMaximise}
        onClose={() => bridge.close()}
      />

      {appUpdate?.available && !appUpdateDismissed && appUpdate.latestVersion !== skippedVersion && (
        <div className="app-update-banner" role="status">
          <IconDownload size={16}/>
          <span>
            {t('update.app.available', {version: appUpdate.latestVersion ?? ''})}
            {appUpdateDownload && <small className="app-update-banner-note">{t('update.app.ready')}</small>}
          </span>
          {appUpdateDownload ? (
            <button className="btn btn-small btn-primary" type="button" onClick={() => void launchAppUpdate()}>
              <IconCheck size={14}/>
              {t('update.app.install')}
            </button>
          ) : (
            <button
              className="btn btn-small btn-primary"
              type="button"
              onClick={() => void downloadAppUpdate()}
              disabled={appUpdateDownloading}
            >
              <IconDownload size={14}/>
              {appUpdateDownloading
                ? t('update.app.downloading', {percent: appUpdateProgress?.percent ?? 0})
                : t('update.app.download')}
            </button>
          )}
          <button className="btn btn-small btn-secondary" type="button" onClick={() => void openAppUpdate()}>
            {t('update.app.notes')}
          </button>
          <button
            className="app-update-dismiss"
            type="button"
            aria-label={t('update.app.dismiss')}
            onClick={() => setAppUpdateDismissed(true)}
          >
            <IconX size={14}/>
          </button>
          {appUpdateDownloading && appUpdateProgress && (
            <div className="app-update-progress" aria-hidden="true">
              <span style={{width: `${appUpdateProgress.percent}%`}}/>
            </div>
          )}
        </div>
      )}

      <div className="app-body">
        <Sidebar
          page={page}
          onNavigate={navigate}
          installedCount={installedCount}
          totalCount={catalog.items.length}
          queueCount={queue.length}
          onOpenQueue={() => setDrawerOpen(true)}
          theme={theme}
          onToggleTheme={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
          version={version}
          onOpenDataFolder={openDataFolder}
        />

        <main className="main" ref={mainRef}>
          {page === 'overview' && (
            <Overview
              catalog={catalog}
              scan={scan}
              scanning={scanning}
              queue={queue}
              updates={updates}
              updatesLoading={updatesLoading}
              onRefreshUpdates={refreshUpdates}
              onStartUpgrade={startUpgrade}
              onScan={refreshScan}
              onNavigate={navigate}
              onOpenItem={setSelected}
              onAdd={addToQueue}
              onAddMany={addMany}
            />
          )}
          {page === 'catalog' && (
            <CatalogPage
              catalog={catalog}
              scan={scan}
              query={query}
              setQuery={setQuery}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              queue={queue}
              updates={updates}
              onUpgrade={startUpgrade}
              onAdd={addToQueue}
              onRemove={removeFromQueue}
              onOpenItem={setSelected}
              searchRef={searchRef}
              scanning={scanning}
            />
          )}
          {page === 'health' && (
            <HealthPage
              scan={scan}
              onToast={showToast}
            />
          )}
          {page === 'system' && (
            <SystemPage
              catalog={catalog}
              scan={scan}
              scanning={scanning}
              queue={queue}
              catalogStatus={catalogStatus}
              catalogRefreshing={catalogRefreshing}
              appUpdate={appUpdate}
              appUpdateLoading={appUpdateLoading}
              appUpdateDownload={appUpdateDownload}
              appUpdateProgress={appUpdateProgress}
              appUpdateDownloading={appUpdateDownloading}
              updateSkipped={Boolean(appUpdate?.latestVersion && appUpdate.latestVersion === skippedVersion)}
              onCheckAppUpdate={() => void checkAppUpdate(true)}
              onOpenAppUpdate={() => void openAppUpdate()}
              onDownloadAppUpdate={() => void downloadAppUpdate()}
              onLaunchAppUpdate={() => void launchAppUpdate()}
              onOpenUpdatesFolder={() => void bridge.openUpdatesFolder()}
              onSkipAppUpdate={skipAppUpdate}
              onUnskipAppUpdate={unskipAppUpdate}
              onScan={refreshScan}
              onAdd={addToQueue}
              onToast={showToast}
              onOpenDataFolder={openDataFolder}
              onRefreshCatalog={(force) => void refreshCatalog(force)}
              onExportProfile={(kind) => void exportProfile(kind)}
              onImportProfile={() => void importProfile()}
              onExportWinget={() => void exportWinget()}
              onImportWinget={() => void importWinget()}
            />
          )}
          {page === 'history' && (
            <HistoryPage
              history={history}
              onClear={clearHistory}
              onNavigateCatalog={() => navigate('catalog')}
            />
          )}
        </main>
      </div>

      <QueueDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        catalog={catalog}
        queue={queue}
        installState={installState}
        showResult={showResult}
        logs={logs}
        onRemove={removeFromQueue}
        onClear={() => setQueue([])}
        onInstall={startInstall}
        onUpgrade={startUpgrade}
        onRetry={(mode, ids) => {
          if (mode === 'upgrade') startUpgrade(ids)
          else if (mode === 'uninstall') void startUninstall(ids)
          else if (mode === 'repair') void startRepair(ids)
          else startInstall(ids)
        }}
        onCancel={cancelInstall}
        onBrowse={() => navigate('catalog')}
      />

      <ItemDialog
        item={selected}
        catalog={catalog}
        scan={scan}
        queued={Boolean(selected && queue.includes(selected.id))}
        onClose={() => setSelected(null)}
        onAdd={(id) => {
          addToQueue(id)
          setSelected(null)
        }}
        onRemove={(id) => {
          removeFromQueue(id)
          setSelected(null)
        }}
        onUninstall={(id) => {
          setSelected(null)
          void startUninstall([id])
        }}
        onRepair={(id) => {
          setSelected(null)
          void startRepair([id])
        }}
        onToast={showToast}
      />

      {toast && (
        <div key={toast.id} className="toast" role="status">
          <IconCheck size={15}/>
          <span>{toast.message}</span>
        </div>
      )}

      {!isDesktop() && (
        <div className="preview-note" title={t('demo.badge')}>
          <IconInfo size={13}/>
          DEMO
        </div>
      )}
    </div>
  )
}

export default App
