import {useDeferredValue, useState} from 'react'
import type {RefObject} from 'react'
import type {Catalog as CatalogType, Item, ScanResult, UpdateReport, WingetSearchResult} from '../types'
import {bridge} from '../bridge'
import {formatSize} from '../format'
import {useI18n} from '../i18n'
import {groupName} from '../catalogText'
import {IconCheck, IconPlus, IconSearch, IconX, Spinner} from '../uiIcons'
import {IconTile, Kbd, SectionHeader} from '../components/Primitives'

type StatusFilter = 'all' | 'missing' | 'installed' | 'updates'

export function Catalog({
  catalog,
  scan,
  query,
  setQuery,
  activeGroup,
  setActiveGroup,
  statusFilter,
  setStatusFilter,
  queue,
  updates,
  onUpgrade,
  onAdd,
  onRemove,
  onOpenItem,
  searchRef,
  scanning,
  onToast,
}: {
  catalog: CatalogType
  scan: ScanResult | null
  query: string
  setQuery: (value: string) => void
  activeGroup: string
  setActiveGroup: (value: string) => void
  statusFilter: StatusFilter
  setStatusFilter: (value: StatusFilter) => void
  queue: string[]
  updates: UpdateReport | null
  onUpgrade: (ids: string[]) => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onOpenItem: (item: Item) => void
  searchRef: RefObject<HTMLInputElement | null>
  scanning: boolean
  onToast: (message: string) => void
}) {
  const {lang, locale, t, tc} = useI18n()
  const [wingetQuery, setWingetQuery] = useState('')
  const [wingetSearch, setWingetSearch] = useState<WingetSearchResult | null>(null)
  const [wingetLoading, setWingetLoading] = useState(false)
  const [wingetConfirm, setWingetConfirm] = useState<string | null>(null)
  const [wingetInstalling, setWingetInstalling] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)
  const installed = scan?.installed ?? {}
  const installedSet = new Set(Object.keys(installed))
  const queueSet = new Set(queue)
  const normalize = (value: string) => value.toLocaleLowerCase(locale)
  const term = normalize(deferredQuery.trim())
  const groupsById = new Map(catalog.groups.map((group) => [group.id, group]))
  const updatesById = new Map((updates?.updates ?? []).map((entry) => [entry.id, entry]))

  const searchMatches = (item: Item) => {
    if (!term) return true
    const group = groupsById.get(item.group)
    const groupWords = group ? [group.name, group.nameEn ?? '', group.description, group.descriptionEn ?? ''] : []
    const haystack = normalize(
      [item.name, item.shortName, item.publisher, item.description, item.descriptionEn ?? '', item.tags.join(' '), ...groupWords].join(' '),
    )
    return term.split(/\s+/).every((part) => haystack.includes(part))
  }

  const statusMatches = (item: Item) => {
    if (statusFilter === 'installed') return installedSet.has(item.id)
    if (statusFilter === 'missing') return !installedSet.has(item.id)
    if (statusFilter === 'updates') return updatesById.has(item.id)
    return true
  }

  const queryMatches = catalog.items.filter(searchMatches)
  const allFiltered = queryMatches.filter(statusMatches)
  const filtered = allFiltered.filter((item) => activeGroup === 'all' || item.group === activeGroup)
  const installedInQuery = queryMatches.filter((item) => installedSet.has(item.id)).length
  const missingInQuery = queryMatches.length - installedInQuery
  const updatesInQuery = queryMatches.filter((item) => updatesById.has(item.id)).length

  const groupCounts = new Map<string, number>()
  for (const item of allFiltered) {
    groupCounts.set(item.group, (groupCounts.get(item.group) ?? 0) + 1)
  }

  const resetFilters = () => {
    setQuery('')
    setActiveGroup('all')
    setStatusFilter('all')
    searchRef.current?.focus()
  }

  const runWingetSearch = async () => {
    const value = wingetQuery.trim()
    if (value.length < 2) return
    setWingetLoading(true)
    setWingetConfirm(null)
    try {
      setWingetSearch(await bridge.searchWinget(value))
    } catch (error) {
      setWingetSearch({
        query: value,
        checkedAt: new Date().toISOString(),
        results: [],
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setWingetLoading(false)
    }
  }

  const installWinget = async (id: string, name: string) => {
    if (wingetConfirm !== id) {
      setWingetConfirm(id)
      return
    }
    setWingetInstalling(id)
    try {
      await bridge.installWingetPackage(id, name)
      onToast(t('toast.wingetStarted', {name}))
      setWingetConfirm(null)
    } catch {
      onToast(t('toast.wingetFail'))
    } finally {
      setWingetInstalling(null)
    }
  }

  return (
    <div className="page catalog-page">
      <div className="page-head catalog-head">
        <div className="page-head-copy">
          <div className="eyebrow">{t('cat.eyebrow', {count: catalog.items.length, date: catalog.updated})}</div>
          <h1>{t('cat.title')}</h1>
          <p className="page-intro">
            {t('cat.intro')}
          </p>
        </div>
        <div className="catalog-search">
          <IconSearch size={18}/>
          <input
            id="catalog-search"
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('cat.searchPlaceholder')}
            aria-label={t('cat.searchAria')}
            autoComplete="off"
          />
          {query ? (
            <button className="search-clear" type="button" onClick={() => setQuery('')} aria-label={t('cat.clearSearch')}>
              <IconX size={15}/>
            </button>
          ) : (
            <Kbd>Ctrl K</Kbd>
          )}
        </div>
      </div>

      <div className="catalog-toolbar">
        <div className="group-tabs" role="tablist" aria-label={t('cat.groupsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeGroup === 'all'}
            className={`group-tab ${activeGroup === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveGroup('all')}
          >
            {t('cat.all')} <span>{allFiltered.length}</span>
          </button>
          {catalog.groups.map((group) => (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={activeGroup === group.id}
              className={`group-tab ${activeGroup === group.id ? 'is-active' : ''}`}
              onClick={() => setActiveGroup(group.id)}
            >
              {groupName(group, lang)} <span>{groupCounts.get(group.id) ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="status-filter" role="group" aria-label={t('cat.filterAria')}>
          <button
            type="button"
            className={statusFilter === 'all' ? 'is-active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            {t('cat.all')}
          </button>
          <button
            type="button"
            className={statusFilter === 'missing' ? 'is-active' : ''}
            onClick={() => setStatusFilter('missing')}
          >
            {t('status.notInstalled')} <span>{missingInQuery}</span>
          </button>
          <button
            type="button"
            className={statusFilter === 'installed' ? 'is-active' : ''}
            onClick={() => setStatusFilter('installed')}
          >
            {t('status.installed')} <span>{installedInQuery}</span>
          </button>
          <button
            type="button"
            className={statusFilter === 'updates' ? 'is-active' : ''}
            onClick={() => setStatusFilter('updates')}
          >
            {t('cat.filter.updates')} <span>{updatesInQuery}</span>
          </button>
        </div>
      </div>

      <div className="catalog-result-line">
        <span>
          {tc('noun.items', filtered.length)}
          {term ? t('cat.forQuery', {query: query.trim()}) : ''}
        </span>
        <span className="mono">
          {scanning ? t('cat.scanning') : scan ? t('cat.captured', {ms: scan.durationMs}) : t('cat.tag')}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="app-grid">
          {filtered.map((item) => {
            const app = installed[item.id]
            const isInstalled = Boolean(app)
            const isQueued = queueSet.has(item.id)
            const update = updatesById.get(item.id)
            const description = lang === 'uk' ? item.description : (item.descriptionEn || item.description)
            const group = groupsById.get(item.group)
            return (
              <article
                key={item.id}
                className={`app-card ${isInstalled ? 'is-installed' : ''} ${isQueued ? 'is-queued' : ''} ${update ? 'is-outdated' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpenItem(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onOpenItem(item)
                }}
              >
                <div className="app-card-top">
                  <IconTile icon={item.icon} size={46}/>
                  <div className="app-card-flags">
                    {update && <span className="app-badge">{t('upd.badge')}</span>}
                    <span className={`app-state ${isInstalled ? 'is-installed' : isQueued ? 'is-queued' : ''}`}>
                      <span className="status-dot"/>
                      {isInstalled
                        ? t('status.installed')
                        : isQueued
                          ? t('action.inQueue')
                          : item.recommended
                            ? t('status.recommended')
                            : group
                              ? groupName(group, lang)
                              : undefined}
                    </span>
                  </div>
                </div>
                <div className="app-card-copy">
                  <h3>{item.shortName}</h3>
                  <span className="app-publisher">{item.publisher}</span>
                  <p>{description}</p>
                </div>
                <div className="app-card-foot">
                  <span className="app-size mono">{formatSize(item.sizeMb)}</span>
                  {isInstalled ? (
                    <span className="app-card-installed">
                      <span
                        className={`app-installed-version mono ${update ? 'is-diff' : ''}`}
                        title={update ? `${update.installed || app.version || ''} → ${update.available || ''}` : app.version}
                      >
                        {update
                          ? `${update.installed || app.version || t('status.detected')} → ${update.available || ''}`
                          : (app.version || t('status.detected'))}
                      </span>
                      {update && (
                        <button
                          type="button"
                          className="mini-add"
                          onClick={(event) => {
                            event.stopPropagation()
                            onUpgrade([item.id])
                          }}
                        >
                          {t('upd.updateOne')}
                        </button>
                      )}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`card-add ${isQueued ? 'is-queued' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (isQueued) onRemove(item.id)
                        else onAdd(item.id)
                      }}
                    >
                      {isQueued ? <IconCheck size={14}/> : <IconPlus size={14}/>}
                      {isQueued ? t('action.inQueue') : t('action.add')}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><IconSearch size={26}/></span>
          <h3>{t('cat.emptyTitle')}</h3>
          <p>{t('cat.emptyText', {count: catalog.items.length})}</p>
          <button className="btn btn-secondary" type="button" onClick={resetFilters}>
            {t('action.reset')}
          </button>
        </div>
      )}

      <section className="section winget-section">
        <SectionHeader title={t('cat.winget.title')} meta={t('cat.winget.meta')}/>
        <form
          className="winget-search"
          onSubmit={(event) => {
            event.preventDefault()
            void runWingetSearch()
          }}
        >
          <IconSearch size={17}/>
          <input
            value={wingetQuery}
            onChange={(event) => setWingetQuery(event.target.value)}
            placeholder={t('cat.winget.placeholder')}
            aria-label={t('cat.winget.placeholder')}
            autoComplete="off"
          />
          <button
            className="btn btn-secondary btn-small"
            type="submit"
            disabled={wingetLoading || wingetQuery.trim().length < 2}
          >
            {wingetLoading ? <Spinner size={14}/> : null}
            {t('cat.winget.search')}
          </button>
        </form>
        <p className="catalog-note">{t('cat.winget.note')}</p>
        {wingetSearch?.error && (
          <div className="health-inline-error">
            <span className="mono">{wingetSearch.error}</span>
          </div>
        )}
        {wingetSearch && wingetSearch.results.length > 0 && (
          <div className="winget-results">
            {wingetSearch.results.map((result) => (
              <div className="winget-row" key={result.id}>
                <div className="winget-copy">
                  <strong>{result.name}</strong>
                  <span className="mono">{result.id}{result.version ? ` · ${result.version}` : ''}</span>
                  {result.match && <span className="winget-match">{result.match}</span>}
                </div>
                <button
                  className={`btn btn-small ${wingetConfirm === result.id ? 'btn-primary' : 'btn-secondary'}`}
                  type="button"
                  onClick={() => void installWinget(result.id, result.name)}
                  disabled={wingetInstalling !== null}
                >
                  {wingetInstalling === result.id ? <Spinner size={13}/> : null}
                  {wingetConfirm === result.id ? t('cat.winget.confirm') : t('cat.winget.install')}
                </button>
              </div>
            ))}
          </div>
        )}
        {wingetSearch && wingetSearch.results.length === 0 && !wingetSearch.error && (
          <div className="empty-inline">{t('cat.winget.empty')}</div>
        )}
      </section>
    </div>
  )
}
