import type {Catalog, Item, Page, ScanResult, UpdateReport} from '../types'
import {formatRam, formatSize, formatTime, formatUnit, relativeScan, todayLabel} from '../format'
import {useI18n} from '../i18n'
import {checkDetail, checkLabel} from '../checks'
import {groupName, presetDescription, presetName} from '../catalogText'
import {
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconInfo,
  IconPlus,
  IconRefresh,
  IconShield,
  Spinner,
} from '../uiIcons'
import {
  IconPresetBase,
  IconPresetCreative,
  IconPresetDev,
  IconPresetGames,
} from '../uiIcons'
import {IconTile, SectionHeader, StatusMark} from '../components/Primitives'

const presetIcons = {
  base: IconPresetBase,
  development: IconPresetDev,
  gaming: IconPresetGames,
  creative: IconPresetCreative,
}

const UPDATE_ROWS = 6

export function Overview({
  catalog,
  scan,
  scanning,
  queue,
  updates,
  updatesLoading,
  onRefreshUpdates,
  onStartUpgrade,
  onScan,
  onNavigate,
  onOpenItem,
  onAdd,
  onAddMany,
}: {
  catalog: Catalog
  scan: ScanResult | null
  scanning: boolean
  queue: string[]
  updates: UpdateReport | null
  updatesLoading: boolean
  onRefreshUpdates: (force: boolean) => void
  onStartUpgrade: (ids: string[]) => void
  onScan: () => void
  onNavigate: (page: Page) => void
  onOpenItem: (item: Item) => void
  onAdd: (id: string) => void
  onAddMany: (ids: string[]) => void
}) {
  const {lang, t, tn, tc} = useI18n()
  const installed = scan?.installed ?? {}
  const installedSet = new Set(Object.keys(installed))
  const queueSet = new Set(queue)
  const total = catalog.items.length
  const installedCount = catalog.items.filter((item) => installedSet.has(item.id)).length
  const percent = total ? Math.round((installedCount / total) * 100) : 0
  const missingRecommended = catalog.items.filter((item) => item.recommended && !installedSet.has(item.id))
  const runtimeChecks = (scan?.checks ?? []).filter((check) => check.kind === 'runtime')
  const runtimeOk = runtimeChecks.filter((check) => check.status === 'ok').length
  const itemsById = new Map(catalog.items.map((item) => [item.id, item]))
  const installedItems = catalog.items.filter((item) => installedSet.has(item.id))
  const groupLabel = (id: string) => {
    const group = catalog.groups.find((entry) => entry.id === id)
    return group ? groupName(group, lang) : ''
  }
  const segments = Array.from({length: 32}, (_, index) => index < Math.round((percent / 100) * 32))
  const system = scan?.system
  const updateItems = updates?.updates ?? []
  const updateMeta = !updates
    ? t('upd.never')
    : updates.error
      ? undefined
      : updateItems.length > 0
        ? tc('upd.available', updateItems.length)
        : t('upd.upToDate')

  const addRecommendations = () => {
    onAddMany(missingRecommended.map((item) => item.id))
  }

  return (
    <div className="page overview-page">
      <div className="page-head">
        <div className="page-head-copy">
          <div className="eyebrow">{t('ov.eyebrow', {date: todayLabel()})}</div>
          <h1>
            {t('ov.title1')}<br/>
            <span>{t('ov.title2')}</span>
          </h1>
          <p className="page-intro">
            {t('ov.intro')}
          </p>
        </div>
        <div className="page-head-actions">
          <div className="scan-caption">
            <span className="mono">{scan ? t('ov.scanCaption', {ms: scan.durationMs}) : t('ov.preparing')}</span>
            <span>{relativeScan(scan?.scannedAt)}</span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onScan} disabled={scanning}>
            {scanning ? <Spinner size={16}/> : <IconRefresh size={16}/>}
            {scanning ? t('ov.scanning') : t('ov.scanAgain')}
          </button>
        </div>
      </div>

      <div className="system-strip">
        <div className="strip-cell">
          <span className="strip-label">{t('strip.os')}</span>
          <strong>{system?.osName || 'Windows'}</strong>
          <span className="strip-detail">
            {system ? `${system.version} · ${system.build}` : t('strip.awaiting')}
          </span>
        </div>
        <div className="strip-cell">
          <span className="strip-label">{t('strip.cpu')}</span>
          <strong className="strip-truncate">{system?.cpu || '—'}</strong>
          <span className="strip-detail">{system ? tc('noun.threads', system.cores) : '—'}</span>
        </div>
        <div className="strip-cell">
          <span className="strip-label">{t('strip.memory')}</span>
          <strong>{system ? formatRam(system.ramTotalGb) : '—'}</strong>
          <span className="strip-detail">{system ? t('strip.free', {value: formatRam(system.ramFreeGb)}) : '—'}</span>
        </div>
        <div className="strip-cell">
          <span className="strip-label">{t('strip.disk', {letter: system?.diskLetter ?? ''})}</span>
          <strong>{system ? formatRam(system.diskFreeGb) : '—'}</strong>
          <span className="strip-detail">{system ? t('strip.freeOf', {total: Math.round(system.diskTotalGb), unit: formatUnit('gb')}) : '—'}</span>
        </div>
      </div>

      <div className="overview-grid">
        <section className="readiness-panel" aria-label={t('ready.label')}>
          <div className="readiness-top">
            <span className="readiness-label">{t('ready.label')}</span>
            <span className="readiness-live mono">LOCAL / LIVE</span>
          </div>
          <div className="readiness-value">
            <strong>{percent}</strong>
            <span>%</span>
          </div>
          <p className="readiness-copy">
            {t('ready.copy', {have: installedCount, total})}
            {missingRecommended.length > 0
              ? t('ready.note', {count: missingRecommended.length, noun: tn('noun.recommendations', missingRecommended.length)})
              : t('ready.complete')}
          </p>
          <div className="readiness-segments" aria-hidden="true">
            {segments.map((active, index) => (
              <span key={index} className={active ? 'is-filled' : ''}/>
            ))}
          </div>
          <div className="readiness-stats">
            <div>
              <span>{t('ready.runtimes')}</span>
              <strong>{runtimeOk}<small> / {runtimeChecks.length || 8}</small></strong>
            </div>
            <div>
              <span>{t('ready.missing')}</span>
              <strong>{missingRecommended.length}<small> {t('ready.recoShort')}</small></strong>
            </div>
            <div>
              <span>{t('ready.free')}</span>
              <strong>{system ? formatRam(system.diskFreeGb) : '—'}</strong>
            </div>
          </div>
          <div className="readiness-actions">
            <button className="btn btn-paper" type="button" onClick={() => onNavigate('catalog')}>
              {t('ready.browse')}
              <IconArrowRight size={16}/>
            </button>
            {missingRecommended.length > 0 && (
              <button className="readiness-text-button" type="button" onClick={addRecommendations}>
                {t('ready.addRecommendations')}
              </button>
            )}
          </div>
        </section>

        <section className="recommended-panel">
          <div className="recommended-head">
            <div>
              <span className="eyebrow">{t('reco.eyebrow')}</span>
              <h2>{t('reco.title')}</h2>
            </div>
            {missingRecommended.length > 0 && (
              <button className="text-button" type="button" onClick={addRecommendations}>
                {t('reco.addAll')}
              </button>
            )}
          </div>
          <div className="reco-list">
            {missingRecommended.slice(0, 4).map((item) => {
              const queued = queueSet.has(item.id)
              return (
                <div
                  key={item.id}
                  className="reco-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onOpenItem(item)
                  }}
                >
                  <IconTile icon={item.icon} size={38}/>
                  <div className="reco-copy">
                    <span className="reco-name">{item.shortName}</span>
                    <span className="reco-group">{groupLabel(item.group)}</span>
                  </div>
                  <span className="reco-size mono">{formatSize(item.sizeMb)}</span>
                  <button
                    className={`add-button ${queued ? 'is-queued' : ''}`}
                    type="button"
                    title={queued ? t('action.inQueue') : t('action.addToQueue')}
                    aria-label={queued ? t('action.inQueue') : `${t('action.add')} ${item.shortName}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onAdd(item.id)
                    }}
                  >
                    {queued ? <IconCheck size={15}/> : <IconPlus size={15}/>}
                  </button>
                </div>
              )
            })}
            {missingRecommended.length === 0 && (
              <div className="reco-complete">
                <IconCheck size={18}/>
                <div>
                  <strong>{t('reco.completeTitle')}</strong>
                  <span>{t('reco.completeText')}</span>
                </div>
              </div>
            )}
          </div>
          <div className="reco-footer">
            <IconInfo size={14}/>
            <span>{t('reco.note')}</span>
          </div>
        </section>
      </div>

      <section className="section">
        <SectionHeader
          index="01"
          title={t('sec.runtimes.title')}
          meta={runtimeChecks.length ? t('sec.runtimes.meta', {ok: runtimeOk, total: runtimeChecks.length}) : undefined}
          action={
            <button className="text-button" type="button" onClick={() => onNavigate('system')}>
              {t('sec.runtimes.details')} <IconArrowRight size={14}/>
            </button>
          }
        />
        <div className="check-grid">
          {(runtimeChecks.length ? runtimeChecks : []).map((check) => {
            const item = itemsById.get(check.id)
            const queued = item ? queueSet.has(item.id) : false
            return (
              <div key={check.id} className={`check-row ${check.status === 'missing' ? 'is-missing' : ''}`}>
                <StatusMark status={check.status} size={17}/>
                <div className="check-copy">
                  <span className="check-label">{checkLabel(check, t, item?.name)}</span>
                  <span className="check-detail">{checkDetail(check, t, {system, version: installed[check.id]?.version})}</span>
                </div>
                {check.status !== 'ok' && item && (
                  <button
                    className={`mini-add ${queued ? 'is-queued' : ''}`}
                    type="button"
                    onClick={() => onAdd(item.id)}
                    disabled={queued}
                  >
                    {queued ? t('action.inQueue') : t('action.add')}
                  </button>
                )}
              </div>
            )
          })}
          {!runtimeChecks.length && <div className="empty-inline">{t('empty.scanPending')}</div>}
        </div>
      </section>

      <section className="section">
        <SectionHeader
          index="02"
          title={t('upd.title')}
          meta={updateMeta}
          action={
            <div className="upd-actions">
              <span className="upd-time mono">
                {updates ? t('upd.checked', {time: formatTime(updates.checkedAt)}) : t('upd.never')}
              </span>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => onRefreshUpdates(true)}
                disabled={updatesLoading}
              >
                {updatesLoading ? <Spinner size={16}/> : <IconRefresh size={16}/>}
                {updatesLoading ? t('upd.checking') : t('upd.check')}
              </button>
              {updateItems.length > 0 && (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => onStartUpgrade(updateItems.map((entry) => entry.id))}
                >
                  <IconDownload size={15}/>
                  {t('upd.updateAll')}
                </button>
              )}
            </div>
          }
        />
        <div className="upd-panel">
          {!updates ? (
            <div className="empty-inline">{updatesLoading ? t('upd.checking') : t('upd.never')}</div>
          ) : updates.error ? (
            <div className="upd-error">
              <span className="upd-error-title">{t('upd.errorTitle')}</span>
              <span className="mono">{updates.error}</span>
            </div>
          ) : updateItems.length > 0 ? (
            <>
              <div className="reco-list">
                {updateItems.slice(0, UPDATE_ROWS).map((entry) => {
                  const item = itemsById.get(entry.id)
                  return (
                    <div key={entry.id} className="reco-row upd-row">
                      {item ? (
                        <IconTile icon={item.icon} size={34}/>
                      ) : (
                        <span className="icon-tile" style={{width: 34, height: 34}}/>
                      )}
                      <div className="reco-copy">
                        <span className="reco-name">{entry.name}</span>
                        <span className="upd-version mono">
                          {entry.installed || '—'} <span className="upd-arrow">→</span> {entry.available || '—'}
                        </span>
                      </div>
                      <button className="mini-add" type="button" onClick={() => onStartUpgrade([entry.id])}>
                        {t('upd.updateOne')}
                      </button>
                    </div>
                  )
                })}
              </div>
              {updateItems.length > UPDATE_ROWS && (
                <div className="upd-more mono">+{updateItems.length - UPDATE_ROWS}</div>
              )}
            </>
          ) : (
            <div className="upd-idle">
              <StatusMark status="ok" size={17}/>
              <span>{t('upd.upToDate')}</span>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <SectionHeader
          index="03"
          title={t('sec.presets.title')}
          meta={t('sec.presets.meta')}
        />
        <div className="preset-grid">
          {catalog.presets.map((preset, index) => {
            const PresetIcon = presetIcons[preset.id as keyof typeof presetIcons] ?? IconPresetBase
            const missing = preset.items.filter((id) => !installedSet.has(id))
            const totalSize = preset.items.reduce((sum, id) => sum + (itemsById.get(id)?.sizeMb ?? 0), 0)
            return (
              <article key={preset.id} className="preset-card">
                <div className="preset-top">
                  <span className="preset-index mono">0{index + 1}</span>
                  <span className="preset-icon"><PresetIcon size={21}/></span>
                </div>
                <h3>{presetName(preset, lang)}</h3>
                <p>{presetDescription(preset, lang)}</p>
                <div className="preset-meta">
                  <span>{missing.length === 0 ? t('preset.complete') : t('preset.missing', {missing: missing.length, total: preset.items.length})}</span>
                  <span className="mono">{formatSize(totalSize)}</span>
                </div>
                <button
                  className={`btn btn-preset ${missing.length === 0 ? 'is-done' : ''}`}
                  type="button"
                  disabled={missing.length === 0}
                  onClick={() => onAddMany(missing)}
                >
                  {missing.length === 0 ? <IconCheck size={15}/> : <IconPlus size={15}/>}
                  {missing.length === 0 ? t('status.done') : t('preset.add', {count: missing.length})}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="section section-installed">
        <SectionHeader
          index="04"
          title={t('sec.installed.title')}
          meta={scan ? tc('noun.items', installedCount) : undefined}
          action={
            <button className="text-button" type="button" onClick={() => onNavigate('catalog')}>
              {t('sec.installed.all')} <IconArrowRight size={14}/>
            </button>
          }
        />
        <div className="installed-list">
          {installedItems.slice(0, 9).map((item) => {
            const app = installed[item.id]
            return (
              <button key={item.id} type="button" className="installed-item" onClick={() => onOpenItem(item)}>
                <IconTile icon={item.icon} size={34}/>
                <span className="installed-copy">
                  <span className="installed-name">{item.shortName}</span>
                  <span className="installed-version mono">{app.version || t('status.detected')}</span>
                </span>
              </button>
            )
          })}
          {scan && installedItems.length === 0 && (
            <div className="empty-inline">{t('installed.empty')}</div>
          )}
        </div>
        <div className="local-note">
          <IconShield size={16}/>
          <span>{t('installed.localNote')}</span>
        </div>
      </section>
    </div>
  )
}
