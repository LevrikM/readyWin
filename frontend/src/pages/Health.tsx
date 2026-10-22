import {useCallback, useEffect, useState} from 'react'
import type {DiskHealth, HealthItem, HealthReport, ScanResult, StartupEntry, StartupReport} from '../types'
import {bridge} from '../bridge'
import {formatDateTime} from '../format'
import {useI18n} from '../i18n'
import type {TranslationKey} from '../i18n'
import {
  IconAlert,
  IconCircleCheck,
  IconCircleX,
  IconRefresh,
  Spinner,
} from '../uiIcons'
import {SectionHeader} from '../components/Primitives'

const GROUPS: Array<{id: string; items: string[]}> = [
  {id: 'security', items: ['defender', 'firewall', 'bitlocker', 'secureBoot', 'activation']},
  {id: 'storage', items: ['disk', 'memory']},
  {id: 'updates', items: ['pendingReboot', 'windowsUpdate', 'restorePoint']},
  {id: 'power', items: ['battery', 'uptime']},
]

function HealthMark({status, size = 16}: {status: string; size?: number}) {
  if (status === 'ok') return <IconCircleCheck size={size} className="status-ok"/>
  if (status === 'bad') return <IconCircleX size={size} className="status-missing"/>
  if (status === 'warn' || status === 'info') return <IconAlert size={size} className="status-warn"/>
  return <span className={`status-dot status-${status}`}/>
}

function statusKey(status: string): TranslationKey {
  const key = `health.status.${status}` as TranslationKey
  return key
}

function itemKey(id: string): TranslationKey {
  return `health.item.${id}` as TranslationKey
}

function sourceKey(source: string): TranslationKey {
  const key = `health.startup.source.${source}` as TranslationKey
  return key
}

function scopeKey(scope: string): TranslationKey {
  const key = `health.startup.scope.${scope}` as TranslationKey
  return key
}

function DiskCard({disk}: {disk: DiskHealth}) {
  const {t} = useI18n()
  const wear = typeof disk.wear === 'number' ? disk.wear : null
  const health = (disk.health || '').toLowerCase()
  const status = health && health !== 'healthy' ? 'bad' : wear !== null && wear >= 80 ? 'bad' : wear !== null && wear >= 60 ? 'warn' : 'ok'
  return (
    <article className={`disk-card is-${status}`}>
      <div className="disk-card-head">
        <HealthMark status={status} size={17}/>
        <span className="disk-name">{disk.name || '—'}</span>
        <span className="disk-media mono">{disk.media || '—'}</span>
      </div>
      <div className="disk-facts">
        <span className="disk-size mono">{Math.round(disk.sizeGb)} GB</span>
        {wear !== null && (
          <span className="disk-wear">
            <span className="disk-wear-bar" aria-hidden="true"><span style={{width: `${Math.min(100, wear)}%`}}/></span>
            <span className="mono">{t('health.disk.wear', {percent: wear})}</span>
          </span>
        )}
        {typeof disk.temperature === 'number' && disk.temperature > 0 && (
          <span className="mono">{t('health.disk.temp', {temp: disk.temperature})}</span>
        )}
        {!disk.operational && !disk.health && <span className="disk-muted">{t('health.disk.noSmart')}</span>}
      </div>
    </article>
  )
}

type StartupFilter = 'all' | 'enabled' | 'disabled'

export function HealthPage({scan, onToast}: {scan: ScanResult | null; onToast: (message: string) => void}) {
  const {t} = useI18n()
  const [health, setHealth] = useState<HealthReport | null>(null)
  const [startup, setStartup] = useState<StartupReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [startupLoading, setStartupLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [startupFilter, setStartupFilter] = useState<StartupFilter>('all')

  const load = useCallback(async (force: boolean) => {
    setLoading(true)
    setStartupLoading(true)
    try {
      const report = await bridge.getHealth(force)
      setHealth(report)
    } catch (error) {
      setHealth({
        checkedAt: new Date().toISOString(),
        durationMs: 0,
        items: [],
        disks: [],
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
    try {
      setStartup(await bridge.getStartup())
    } catch (error) {
      setStartup({
        checkedAt: new Date().toISOString(),
        entries: [],
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setStartupLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  const toggleStartup = async (entry: StartupEntry) => {
    setToggling(entry.id)
    const enabled = !entry.enabled
    try {
      await bridge.setStartupEnabled(entry.id, enabled)
      setStartup((previous) =>
        previous
          ? {
              ...previous,
              entries: previous.entries.map((candidate) =>
                candidate.id === entry.id ? {...candidate, enabled, state: enabled ? 'Ready' : 'Disabled'} : candidate,
              ),
            }
          : previous,
      )
    } catch {
      onToast(t('toast.startupFail'))
    } finally {
      setToggling(null)
    }
  }

  const items = health?.items ?? []
  const itemMap = new Map(items.map((item) => [item.id, item]))
  const okCount = items.filter((item) => item.status === 'ok').length
  const scored = items.filter((item) => item.status !== 'info' && item.status !== 'na')
  const total = scored.length
  const percent = total ? Math.round((okCount / total) * 100) : 0
  const counts = {
    ok: okCount,
    warn: items.filter((item) => item.status === 'warn').length,
    bad: items.filter((item) => item.status === 'bad').length,
    unknown: items.filter((item) => item.status === 'unknown' || item.status === 'na').length,
  }
  const entries = startup?.entries ?? []
  const enabledCount = entries.filter((entry) => entry.enabled).length
  const disabledCount = entries.length - enabledCount
  const filteredEntries = entries.filter((entry) => {
    if (startupFilter === 'enabled') return entry.enabled
    if (startupFilter === 'disabled') return !entry.enabled
    return true
  })

  const itemDetail = (item: HealthItem) => {
    if (item.id === 'defender' && item.detail) {
      if (item.detail === 'disabled') return t('health.detail.defenderDisabled')
      if (/^\d+$/.test(item.detail)) return t('health.detail.signatureAge', {days: item.detail})
      return item.detail
    }
    if (item.id === 'pendingReboot' && item.detail) {
      return item.detail
        .split(',')
        .filter(Boolean)
        .map((reason) => t(`health.detail.reboot.${reason.trim()}` as TranslationKey))
        .join(', ')
    }
    if (item.id === 'firewall' && item.detail) return item.detail
    if (item.id === 'windowsUpdate' && item.detail) { try { return item.detail ? formatDateTime(item.detail) : '' } catch { return item.detail } }
    if (item.id === 'restorePoint') return item.value ? item.detail : t('health.restore.none')
    if (item.id === 'battery') {
      if (item.status === 'na') return t('health.battery.desktop')
      if (/^\d+$/.test(item.detail ?? '')) return t('health.battery.charge', {percent: item.detail ?? ''})
      return item.detail
    }
    if (item.id === 'activation' && item.detail) return item.detail
    if (item.id === 'bitlocker' && item.detail) return item.detail
    return item.detail
  }

  const itemValue = (item: HealthItem) => {
    switch (item.id) {
      case 'restorePoint': {
        if (!item.value) return ''
        try {
          return formatDateTime(item.value)
        } catch {
          return item.value
        }
      }
      case 'windowsUpdate':
        return item.value ?? ''
      case 'battery':
        return /^\d+$/.test(item.value ?? '') ? t('health.battery.health', {percent: item.value ?? ''}) : ''
      case 'secureBoot':
        return item.value === 'on' || item.value === 'off'
          ? t(`health.value.secureBoot.${item.value}` as TranslationKey)
          : ''
      case 'bitlocker':
        return ['on', 'off', 'unknown'].includes(item.value ?? '')
          ? t(`health.value.bitlocker.${item.value}` as TranslationKey)
          : item.value ?? ''
      case 'activation':
        return ['licensed', 'unlicensed', 'unknown'].includes(item.value ?? '')
          ? t(`health.value.activation.${item.value}` as TranslationKey)
          : item.value ?? ''
      case 'pendingReboot':
        return ''
      default:
        return item.value ?? ''
    }
  }

  return (
    <div className="page health-page">
      <div className="page-head">
        <div className="page-head-copy">
          <div className="eyebrow">{t('health.eyebrow')}</div>
          <h1>{t('health.title')}</h1>
          <p className="page-intro">{t('health.intro')}</p>
        </div>
        <div className="page-head-actions">
          <div className="scan-caption">
            <span className="mono">{health ? t('health.score', {ok: okCount, total}) : t('health.refreshing')}</span>
            <span>{health ? t('health.checked', {date: formatDateTime(health.checkedAt)}) : t('empty.scanPending')}</span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => void load(true)} disabled={loading}>
            {loading ? <Spinner size={16}/> : <IconRefresh size={16}/>}
            {loading ? t('health.refreshing') : t('health.refresh')}
          </button>
        </div>
      </div>

      <div className="health-hero">
        <div className="health-score">
          <strong>{percent}</strong><span>%</span>
        </div>
        <div className="health-hero-copy">
          <strong>{health ? t('health.score', {ok: okCount, total}) : t('health.empty')}</strong>
          <span>{health?.error ? t('health.error') : t('sys.note')}</span>
        </div>
        <div className="health-counts">
          <span className="is-ok"><i/>{counts.ok}</span>
          <span className="is-warn"><i/>{counts.warn}</span>
          <span className="is-bad"><i/>{counts.bad}</span>
          <span className="is-unknown"><i/>{counts.unknown}</span>
        </div>
      </div>

      {!health && loading && <div className="empty-inline">{t('health.refreshing')}…</div>}
      {health?.error && <div className="upd-error"><span className="upd-error-title">{t('health.error')}</span><span className="mono">{health.error}</span></div>}

      {health && GROUPS.map((group) => {
        const groupItems = group.items.map((id) => itemMap.get(id)).filter((item): item is HealthItem => Boolean(item))
        if (groupItems.length === 0) return null
        return (
          <section className="section" key={group.id}>
            <SectionHeader title={t(`health.group.${group.id}` as TranslationKey)} />
            <div className="health-grid">
              {groupItems.map((item) => (
                <article key={item.id} className={`health-card is-${item.status}`}>
                  <div className="health-card-head">
                    <HealthMark status={item.status} size={17}/>
                    <span className="health-card-title">{t(itemKey(item.id))}</span>
                    <span className="health-state">{t(statusKey(item.status))}</span>
                  </div>
                  {itemValue(item) && <strong className="health-value mono">{itemValue(item)}</strong>}
                  {itemDetail(item) && <span className="health-detail">{itemDetail(item)}</span>}
                  {scan && item.id === 'disk' && <span className="health-detail">{scan.system.diskLetter}</span>}
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {health && health.disks.length > 0 && (
        <section className="section">
          <SectionHeader title={t('health.disk.title')} meta={t('health.disk.meta')} />
          <div className="disk-grid">
            {health.disks.map((disk) => <DiskCard key={`${disk.name}-${disk.sizeGb}`} disk={disk}/>)}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHeader
          title={t('health.startup.title')}
          meta={t('health.startup.meta', {count: entries.length})}
          action={
            <button className="text-button" type="button" onClick={() => void load(false)} disabled={startupLoading}>
              {startupLoading ? <Spinner size={14}/> : <IconRefresh size={14}/>}
              {startupLoading ? t('health.startup.refreshing') : t('health.refresh')}
            </button>
          }
        />
        {startup?.error && <div className="health-inline-error">{t('health.startup.error')} <span className="mono">{startup.error}</span></div>}
        {entries.length > 0 && (
          <div className="startup-toolbar">
            <div className="status-filter" role="group" aria-label={t('health.startup.filter')}>
              <button
                className={startupFilter === 'all' ? 'is-active' : ''}
                type="button"
                onClick={() => setStartupFilter('all')}
              >
                {t('health.startup.filter.all')} <span>{entries.length}</span>
              </button>
              <button
                className={startupFilter === 'enabled' ? 'is-active' : ''}
                type="button"
                onClick={() => setStartupFilter('enabled')}
              >
                {t('health.startup.enabled')} <span>{enabledCount}</span>
              </button>
              <button
                className={startupFilter === 'disabled' ? 'is-active' : ''}
                type="button"
                onClick={() => setStartupFilter('disabled')}
              >
                {t('health.startup.disabled')} <span>{disabledCount}</span>
              </button>
            </div>
            <span className="startup-filter-count mono">
              {t('health.startup.shown', {count: filteredEntries.length})}
            </span>
          </div>
        )}
        {filteredEntries.length > 0 ? (
          <div className="startup-table">
            <div className="startup-head">
              <span>{t('health.startup.title')}</span>
              <span>{t('dlg.category')}</span>
              <span>{t('health.startup.enabled')}</span>
              <span/>
            </div>
            {filteredEntries.map((entry) => (
              <div key={entry.id} className={`startup-row ${entry.enabled ? '' : 'is-disabled'}`}>
                <div className="startup-name">
                  <span className={`startup-dot ${entry.enabled ? 'is-on' : ''}`}/>
                  <div>
                    <strong>{entry.name}</strong>
                    <span className="startup-command mono" title={entry.command}>{entry.command}</span>
                  </div>
                </div>
                <div className="startup-meta">
                  <span>{t(sourceKey(entry.source))}</span>
                  <span className="mono">{t(scopeKey(entry.scope))}</span>
                </div>
                <span className={`startup-state ${entry.enabled ? 'is-on' : ''}`}>
                  {entry.enabled ? t('health.startup.enabled') : t('health.startup.disabled')}
                </span>
                <button
                  className={`btn btn-small ${entry.enabled ? 'btn-ghost' : 'btn-secondary'}`}
                  type="button"
                  disabled={!entry.canToggle || toggling === entry.id}
                  onClick={() => void toggleStartup(entry)}
                >
                  {toggling === entry.id ? <Spinner size={13}/> : null}
                  {entry.enabled ? t('health.startup.disable') : t('health.startup.enable')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          !startupLoading && (
            <div className="empty-inline">
              {entries.length > 0 ? t('health.startup.filterEmpty') : t('health.startup.empty')}
            </div>
          )
        )}
        <div className="health-note">{t('health.startup.note')}{enabledCount > 0 ? ` · ${enabledCount}` : ''}</div>
      </section>
    </div>
  )
}
