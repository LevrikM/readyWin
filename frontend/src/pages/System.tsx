import type {
  Catalog,
  CatalogStatus,
  ScanResult,
} from '../types'
import {formatDateTime, formatRam} from '../format'
import {useI18n} from '../i18n'
import {checkDetail, checkLabel} from '../checks'
import {
  IconCheck,
  IconCopy,
  IconExternal,
  IconRefresh,
  IconShield,
  IconTerminal,
  Spinner,
} from '../uiIcons'
import {SectionHeader, StatusMark} from '../components/Primitives'

export function SystemPage({
  catalog,
  scan,
  scanning,
  queue,
  catalogStatus,
  catalogRefreshing,
  onScan,
  onAdd,
  onToast,
  onOpenDataFolder,
  onRefreshCatalog,
  onExportProfile,
  onImportProfile,
  onExportWinget,
  onImportWinget,
}: {
  catalog: Catalog
  scan: ScanResult | null
  scanning: boolean
  queue: string[]
  catalogStatus: CatalogStatus | null
  catalogRefreshing: boolean
  onScan: () => void
  onAdd: (id: string) => void
  onToast: (message: string) => void
  onOpenDataFolder: () => void
  onRefreshCatalog: (force: boolean) => void
  onExportProfile: (kind: 'selected' | 'installed') => void
  onImportProfile: () => void
  onExportWinget: () => void
  onImportWinget: () => void
}) {
  const {locale, t, tc} = useI18n()
  const system = scan?.system
  const checks = scan?.checks ?? []
  const runtimeChecks = checks.filter((check) => check.kind === 'runtime')
  const serviceChecks = checks.filter((check) => check.kind !== 'runtime')
  const itemsById = new Map(catalog.items.map((item) => [item.id, item]))
  const queueSet = new Set(queue)
  const runtimeOk = runtimeChecks.filter((check) => check.status === 'ok').length
  const checksOk = checks.filter((check) => check.status === 'ok').length
  const catalogSourceKey =
    catalogStatus?.source === 'remote'
      ? 'sys.catalog.source.remote'
      : catalogStatus?.source === 'cache'
        ? 'sys.catalog.source.cache'
        : 'sys.catalog.source.embedded'

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    onToast(t('sys.reportCopied'))
  }

  const copyReport = () => {
    if (!system) return
    const lines = [
      t('rpt.title'),
      t('rpt.date', {date: new Date().toLocaleString(locale)}),
      '',
      t('rpt.os', {value: `${system.osName} ${system.version} (${system.build})`}),
      t('rpt.arch', {value: system.arch}),
      t('rpt.device', {value: system.hostname}),
      t('rpt.user', {value: system.username}),
      t('rpt.cpu', {value: `${system.cpu} В· ${tc('noun.threads', system.cores)}`}),
      t('rpt.gpu', {value: system.gpu.join(', ') || 'вЂ”'}),
      t('rpt.memory', {value: `${formatRam(system.ramTotalGb)} (${t('strip.free', {value: formatRam(system.ramFreeGb)})})`}),
      t('rpt.disk', {letter: system.diskLetter, value: `${formatRam(system.diskFreeGb)} / ${formatRam(system.diskTotalGb)}`}),
      t('rpt.rights', {value: system.elevated ? t('rpt.rightsAdmin') : t('rpt.rightsUser')}),
      '',
      t('rpt.checks'),
      ...checks.map((check) => {
        const status = check.status === 'ok' ? t('rpt.ok') : check.status === 'warn' ? t('rpt.warn') : t('rpt.missing')
        const label = checkLabel(check, t, itemsById.get(check.id)?.name)
        const detail = checkDetail(check, t, {system, version: scan?.installed[check.id]?.version})
        return `- ${label}: ${status} вЂ” ${detail}`
      }),
    ]
    void copyText(lines.join('\r\n'))
  }

  return (
    <div className="page system-page">
      <div className="page-head">
        <div className="page-head-copy">
          <div className="eyebrow">{t('sys.eyebrow')}</div>
          <h1>{t('sys.title')}</h1>
          <p className="page-intro">
            {t('sys.intro')}
          </p>
        </div>
        <div className="page-head-actions">
          <span className={`elevation-badge ${system?.elevated ? 'is-admin' : ''}`}>
            <IconShield size={15}/>
            {system?.elevated ? t('sys.admin') : t('sys.notAdmin')}
          </span>
          <button className="btn btn-secondary" type="button" onClick={onScan} disabled={scanning}>
            {scanning ? <Spinner size={16}/> : <IconRefresh size={16}/>}
            {scanning ? t('ov.scanning') : t('sys.scan')}
          </button>
        </div>
      </div>

      <div className="system-grid">
        <div className="system-main">
          <section className="panel">
            <SectionHeader
              index="01"
              title={t('sys.os.title')}
              meta={scan ? t('sys.updated', {date: formatDateTime(scan.scannedAt)}) : t('strip.awaiting')}
            />
            <div className="info-table">
              <InfoRow label={t('row.device')} value={system?.hostname ?? 'вЂ”'}/>
              <InfoRow label={t('row.version')} value={system ? `${system.osName} ${system.version}` : 'вЂ”'}/>
              <InfoRow label={t('row.build')} value={system?.build ?? 'вЂ”'} mono/>
              <InfoRow label={t('row.arch')} value={system?.arch ?? 'вЂ”'} mono/>
              <InfoRow label={t('row.user')} value={system?.username ?? 'вЂ”'}/>
              <InfoRow
                label={t('row.rights')}
                value={system?.elevated ? t('row.rightsElevated') : t('row.rightsNormal')}
              />
            </div>
          </section>

          <section className="panel">
            <SectionHeader index="02" title={t('sys.hw.title')}/>
            <div className="info-table">
              <InfoRow label={t('strip.cpu')} value={system?.cpu ?? 'вЂ”'}/>
              <InfoRow label={t('row.threads')} value={system ? `${system.cores}` : 'вЂ”'} mono/>
              <InfoRow label={t('row.gpu')} value={system?.gpu.length ? system.gpu.join(' В· ') : 'вЂ”'}/>
              <InfoRow
                label={t('strip.memory')}
                value={system ? t('row.memoryValue', {total: formatRam(system.ramTotalGb), free: formatRam(system.ramFreeGb)}) : 'вЂ”'}
              />
              <InfoRow
                label={t('row.sysDisk')}
                value={system ? t('row.diskValue', {letter: system.diskLetter, free: formatRam(system.diskFreeGb), total: formatRam(system.diskTotalGb)}) : 'вЂ”'}
              />
            </div>
          </section>

          <section className="panel">
            <SectionHeader
              index="03"
              title={t('sys.runtimes.title')}
              meta={t('sec.runtimes.meta', {ok: runtimeOk, total: runtimeChecks.length || 8})}
            />
            <div className="runtime-list">
              {runtimeChecks.map((check) => {
                const item = itemsById.get(check.id)
                const queued = item ? queueSet.has(item.id) : false
                return (
                  <div key={check.id} className="runtime-row">
                    <StatusMark status={check.status} size={17}/>
                    <div className="runtime-copy">
                      <span className="runtime-name">{checkLabel(check, t, item?.name)}</span>
                      <span className="runtime-detail">{checkDetail(check, t, {system, version: scan?.installed[check.id]?.version})}</span>
                    </div>
                    {check.status === 'ok' ? (
                      <span className="runtime-state mono">OK</span>
                    ) : item ? (
                      <button
                        className={`mini-add ${queued ? 'is-queued' : ''}`}
                        type="button"
                        onClick={() => onAdd(item.id)}
                        disabled={queued}
                      >
                        {queued ? t('action.inQueue') : t('action.add')}
                      </button>
                    ) : null}
                  </div>
                )
              })}
              {!runtimeChecks.length && <div className="empty-inline">{t('empty.scanPending')}</div>}
            </div>
          </section>

          <section className="panel transfer-panel">
            <SectionHeader index="04" title={t('sys.transfer.title')}/>
            <p className="panel-copy">{t('sys.transfer.text')}</p>
            <div className="transfer-actions">
              <button className="btn btn-secondary" type="button" onClick={() => onExportProfile('selected')}>
                {t('sys.exportSelection')}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => onExportProfile('installed')}>
                {t('sys.exportInstalled')}
              </button>
              <button className="btn btn-primary" type="button" onClick={onImportProfile}>
                {t('sys.importProfile')}
              </button>
            </div>
            <div className="transfer-actions is-quiet">
              <button className="text-button" type="button" onClick={onExportWinget}>{t('sys.wingetExport')}</button>
              <button className="text-button" type="button" onClick={onImportWinget}>{t('sys.wingetImport')}</button>
            </div>
            <p className="transfer-note">{t('sys.transfer.note')}</p>
          </section>
        </div>

        <aside className="system-side">
          <section className="report-panel">
            <div className="report-icon"><IconTerminal size={20}/></div>
            <span className="eyebrow">{t('sys.report.eyebrow')}</span>
            <h2>{t('sys.report.title')}</h2>
            <p>
              {t('sys.report.text')}
            </p>
            <div className="report-lines mono">
              <span>{system ? `${system.cpu} В· ${tc('noun.threads', system.cores)}` : `${t('strip.cpu')} вЂ”`}</span>
              <span>{system ? `${formatRam(system.ramTotalGb)} RAM В· ${t('strip.free', {value: formatRam(system.diskFreeGb)})}` : `${t('strip.memory')} вЂ”`}</span>
              <span>{system ? `${system.osName} ${system.version} В· ${system.build}` : 'Windows вЂ”'}</span>
            </div>
            <button className="btn btn-paper report-button" type="button" onClick={copyReport} disabled={!scan}>
              <IconCopy size={16}/>
              {t('sys.copyReport')}
            </button>
            <button className="report-link" type="button" onClick={onOpenDataFolder}>
              {t('side.openData')}
              <IconExternal size={14}/>
            </button>
          </section>

          <section className="panel side-panel">
            <SectionHeader title={t('sys.checks.title')} meta={scan ? t('sec.runtimes.meta', {ok: checksOk, total: checks.length}) : undefined}/>
            <div className="service-list">
              {serviceChecks.map((check) => (
                <div key={check.id} className="service-row">
                  <StatusMark status={check.status} size={16}/>
                  <div>
                    <span className="service-name">{checkLabel(check, t, itemsById.get(check.id)?.name)}</span>
                    <span className="service-detail">{checkDetail(check, t, {system, version: scan?.installed[check.id]?.version})}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel side-panel catalog-panel">
            <SectionHeader title={t('sys.catalog.title')} meta={t(catalogSourceKey)}/>
            <div className="catalog-status">
              <span className="mono">
                {t('sys.catalog.version', {
                  version: catalogStatus?.version ?? catalog.version,
                  count: catalogStatus?.itemCount ?? catalog.items.length,
                })}
              </span>
              <span>{t('sys.catalog.updated', {date: catalogStatus?.updated ?? catalog.updated})}</span>
              {catalogStatus?.checkedAt && (
                <span>{t('sys.catalog.checked', {date: formatDateTime(catalogStatus.checkedAt)})}</span>
              )}
            </div>
            {catalogStatus?.error && (
              <div className="health-inline-error">
                {t('sys.catalog.error')} <span className="mono">{catalogStatus.error}</span>
              </div>
            )}
            <button
              className="btn btn-secondary btn-block"
              type="button"
              onClick={() => onRefreshCatalog(true)}
              disabled={catalogRefreshing}
            >
              {catalogRefreshing ? <Spinner size={15}/> : <IconRefresh size={15}/>}
              {catalogRefreshing ? t('sys.catalog.checking') : t('sys.catalog.check')}
            </button>
            <p className="catalog-note">{t('sys.catalog.note')}</p>
          </section>


          <div className="local-note side-note">
            <IconCheck size={16}/>
            <span>{t('sys.note')}</span>
          </div>
        </aside>
      </div>

      <div className="system-footnote">
        <span className="mono">{t('sys.footScan', {ms: scan ? scan.durationMs : 'вЂ”'})}</span>
        <span>{scan ? t('sys.footLast', {date: formatDateTime(scan.scannedAt)}) : t('sys.footNever')}</span>
      </div>
    </div>
  )
}

function InfoRow({label, value, mono = false}: {label: string; value: string; mono?: boolean}) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-value ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  )
}
