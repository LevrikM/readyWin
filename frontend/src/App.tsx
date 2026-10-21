import {useCallback, useEffect, useRef, useState} from 'react'
import './App.css'
import {bridge, embeddedCatalog, isDesktop} from './bridge'
import type {
  Catalog,
  HistoryEntry,
  InstallEvent,
  InstallState,
  Item,
  Page,
  ScanResult,
  UpdateReport,
} from './types'
import {useI18n} from './i18n'
import {Titlebar} from './components/Titlebar'
import {Sidebar} from './components/Sidebar'
import {QueueDrawer} from './components/QueueDrawer'
import {ItemDialog} from './components/ItemDialog'
import {IconCheck, IconInfo} from './uiIcons'
import {Overview} from './pages/Overview'
import {Catalog as CatalogPage} from './pages/Catalog'
import {SystemPage} from './pages/System'
import {HistoryPage} from './pages/History'

type StatusFilter = 'all' | 'missing' | 'installed' | 'updates'

function initialTheme(): 'light' | 'dark' {
  const saved =
    localStorage.getItem('readywin.theme') ?? localStorage.getItem('firstwin.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const {t, tn} = useI18n()
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('readywin.theme', theme)
  }, [theme])

  useEffect(() => {
    let alive = true
    void bridge.getCatalog().then((value) => {
      if (alive) setCatalog(value)
    }).catch(() => undefined)
    void bridge.getVersion().then((value) => {
      if (alive) setVersion(value)
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

  const startInstall = async () => {
    if (queue.length === 0) return
    setLogs([])
    setResultDismissed(false)
    setDrawerOpen(true)
    try {
      const state = await bridge.startInstall(queue)
      setInstallState(state)
    } catch {
      showToast(t('toast.installFail'))
    }
  }

  const startUpgrade = async (ids: string[]) => {
    if (ids.length === 0) return
    setLogs([])
    setResultDismissed(false)
    setDrawerOpen(true)
    try {
      const state = await bridge.startUpgrade(ids)
      setInstallState(state)
    } catch {
      showToast(t('toast.upgradeFail'))
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
          {page === 'system' && (
            <SystemPage
              catalog={catalog}
              scan={scan}
              scanning={scanning}
              queue={queue}
              onScan={refreshScan}
              onAdd={addToQueue}
              onToast={showToast}
              onOpenDataFolder={openDataFolder}
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
