import {useEffect} from 'react'
import type {Catalog, InstallState} from '../types'
import {formatSize} from '../format'
import {useI18n} from '../i18n'
import type {TranslationKey} from '../i18n'
import {installResultText} from '../installText'
import {
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconInfo,
  IconMinus,
  IconQueue,
  IconTrash,
  IconX,
  Spinner,
} from '../uiIcons'
import {IconTile} from './Primitives'

const statusKeys: Record<string, TranslationKey> = {
  pending: 'status.pending',
  running: 'status.running',
  ok: 'status.done',
  failed: 'status.failed',
  skipped: 'status.skipped',
}

const noteKeys: Record<string, TranslationKey> = {
  installed: 'note.installed',
  already: 'note.already',
  upgraded: 'note.upgraded',
  uptodate: 'note.uptodate',
  restart: 'note.restart',
  skipped: 'note.skipped',
  failed: 'note.failed',
}

export function QueueDrawer({
  open,
  onClose,
  catalog,
  queue,
  installState,
  showResult,
  logs,
  onRemove,
  onClear,
  onInstall,
  onUpgrade,
  onCancel,
  onBrowse,
}: {
  open: boolean
  onClose: () => void
  catalog: Catalog
  queue: string[]
  installState: InstallState | null
  showResult: boolean
  logs: string[]
  onRemove: (id: string) => void
  onClear: () => void
  onInstall: () => void
  onUpgrade: (ids: string[]) => void
  onCancel: () => void
  onBrowse: () => void
}) {
  const {t} = useI18n()
  const inProgress = Boolean(installState?.active)
  const isUpgrade = installState?.mode === 'upgrade'
  const resultMode = Boolean(installState && (inProgress || (installState.finished && showResult)))
  const itemsById = new Map(catalog.items.map((item) => [item.id, item]))
  const queueItems = queue.map((id) => itemsById.get(id)).filter((item) => item !== undefined)
  const totalSize = queueItems.reduce((sum, item) => sum + item.sizeMb, 0)
  const stateItems = installState?.items ?? []
  const finishedCount = stateItems.filter((item) => item.status === 'ok' || item.status === 'failed' || item.status === 'skipped').length
  const okCount = stateItems.filter((item) => item.status === 'ok').length
  const failedItems = stateItems.filter((item) => item.status === 'failed' || item.status === 'skipped')
  const added = installState?.added ?? []
  const removed = installState?.removed ?? []
  const restartItems = stateItems.filter((item) => item.note === 'restart')
  const baseline = installState?.baselineCount ?? stateItems.length
  const after = baseline - removed.length + added.length
  const progress = stateItems.length
    ? Math.min(100, Math.round(((finishedCount + (stateItems.some((item) => item.status === 'running') ? 0.35 : 0)) / stateItems.length) * 100))
    : 0

  const resultText = installState
    ? installResultText(t, {
        code: installState.code,
        mode: installState.mode,
        ok: installState.okCount ?? okCount,
        total: stateItems.length,
        skipped: installState.skippedCount,
        added: isUpgrade ? 0 : added.length,
        removed: isUpgrade ? 0 : removed.length,
      })
    : ''

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="drawer-layer" role="presentation" onClick={onClose}>
      <aside
        className="queue-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <span className="eyebrow">
              {resultMode ? (inProgress ? (isUpgrade ? t('q.mode.upgrade') : t('q.eyebrowInstall')) : t('q.eyebrowResult')) : t('queue.title')}
            </span>
            <h2 id="queue-title">
              {resultMode
                ? inProgress
                  ? (isUpgrade ? t('q.mode.running') : t('q.titleRunning'))
                  : (isUpgrade ? t('q.mode.done') : t('status.done'))
                : t('q.titleToInstall')}
            </h2>
          </div>
          <button className="icon-button drawer-close" type="button" onClick={onClose} aria-label={t('q.closeAria')}>
            <IconX size={18}/>
          </button>
        </header>

        {resultMode && installState ? (
          <>
            <div className="install-summary">
              <div className="install-progress-head">
                <span>
                  {inProgress
                    ? (installState.cancelling ? t('q.cancelNote') : t('q.preparing'))
                    : t('q.eyebrowResult')}
                </span>
                <span className="mono">{finishedCount} / {stateItems.length}</span>
              </div>
              <div className="install-progress" aria-hidden="true">
                <span style={{width: `${progress}%`}}/>
              </div>
            </div>

            <div className="install-list">
              {stateItems.map((item) => {
                const catalogItem = itemsById.get(item.id)
                const statusKey = item.note ? noteKeys[item.note] : statusKeys[item.status]
                return (
                  <div key={item.id} className={`install-row is-${item.status}`}>
                    {catalogItem ? <IconTile icon={catalogItem.icon} size={34}/> : <span className="icon-tile" style={{width: 34, height: 34}}/>}
                    <div className="install-copy">
                      <span className="install-name">{item.name}</span>
                      <span className="install-status">
                        {item.status === 'running' && <Spinner size={12}/>}
                        {statusKey ? t(statusKey) : item.status}
                        {item.status === 'failed' && item.exitCode ? ` · ${item.exitCode}` : ''}
                      </span>
                      {item.status === 'failed' && item.message && (
                        <span className="install-tech mono">{item.message}</span>
                      )}
                    </div>
                    <span className="install-mark">
                      {item.status === 'ok' && <IconCheck size={15}/>}
                      {item.status === 'failed' && <IconX size={15}/>}
                      {item.status === 'skipped' && <IconMinus size={15}/>}
                      {item.status === 'pending' && <span className="status-dot"/>}
                    </span>
                  </div>
                )
              })}
            </div>

            {logs.length > 0 && (
              <details className="install-log">
                <summary>{t('q.log')} <span className="mono">{logs.length}</span></summary>
                <pre>{logs.slice(-80).join('\n')}</pre>
              </details>
            )}

            <footer className="drawer-foot">
              {inProgress ? (
                <>
                  <div className="drawer-note">
                    <IconInfo size={14}/>
                    <span>
                      {installState.cancelling ? t('q.cancelNote') : t('q.uacNote')}
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-block" type="button" onClick={onCancel} disabled={installState.cancelling}>
                    {installState.cancelling ? t('q.cancelling') : t('q.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <div className={`result-banner ${installState.cancelled ? 'is-warn' : installState.success ? 'is-ok' : 'is-error'}`}>
                    <span className="result-mark">
                      {installState.cancelled ? <IconMinus size={15}/> : installState.success ? <IconCheck size={15}/> : <IconX size={15}/>}
                    </span>
                    <div>
                      <strong>{installState.cancelled ? t('q.resultCancelled') : installState.success ? t('q.resultOk') : t('q.resultErr')}</strong>
                      <span>{resultText}</span>
                    </div>
                  </div>

                  {restartItems.length > 0 && (
                    <div className="drawer-note">
                      <IconInfo size={14}/>
                      <span>{t('q.restartHint')}</span>
                    </div>
                  )}

                  {!isUpgrade && (added.length > 0 || removed.length > 0) && (
                    <div className="install-diff">
                      <div className="install-diff-head">
                        <span className="install-diff-title">{t('q.diffTitle')}</span>
                        <span className="install-diff-line mono">{t('q.beforeAfter', {before: baseline, after})}</span>
                      </div>
                      {added.length > 0 && (
                        <div className="journal-chips">
                          {added.map((change) => (
                            <span key={`added-${change.id}`} className="journal-chip is-ok">
                              <IconCheck size={12}/>
                              {change.name}{change.version ? ` ${change.version}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {removed.length > 0 && (
                        <>
                          <span className="install-diff-title">{t('q.diffRemoved')}</span>
                          <div className="journal-chips">
                            {removed.map((change) => (
                              <span key={`removed-${change.id}`} className="journal-chip is-failed">
                                <IconMinus size={12}/>
                                {change.name}{change.version ? ` ${change.version}` : ''}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="drawer-actions">
                    {failedItems.length > 0 && (
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => (isUpgrade ? onUpgrade(failedItems.map((item) => item.id)) : onInstall())}
                      >
                        <IconDownload size={15}/>
                        {t('q.retry')}
                      </button>
                    )}
                    <button className="btn btn-secondary" type="button" onClick={onClose}>
                      {t('action.close')}
                    </button>
                  </div>
                </>
              )}
            </footer>
          </>
        ) : queueItems.length > 0 ? (
          <>
            <div className="queue-overview">
              <div>
                <span className="strip-label">{t('q.packages')}</span>
                <strong>{queueItems.length}</strong>
              </div>
              <div>
                <span className="strip-label">{t('q.estimate')}</span>
                <strong>{formatSize(totalSize)}</strong>
              </div>
              <div>
                <span className="strip-label">{t('q.uacPrompts')}</span>
                <strong>1</strong>
              </div>
            </div>

            <div className="queue-list">
              {queueItems.map((item) => (
                <div key={item.id} className="queue-row">
                  <IconTile icon={item.icon} size={36}/>
                  <div className="queue-copy">
                    <span className="queue-name">{item.shortName}</span>
                    <span className="queue-publisher">{item.publisher} · {formatSize(item.sizeMb)}</span>
                  </div>
                  <button className="icon-button queue-remove" type="button" onClick={() => onRemove(item.id)} aria-label={t('q.remove', {name: item.shortName})}>
                    <IconX size={15}/>
                  </button>
                </div>
              ))}
            </div>

            <footer className="drawer-foot">
              <div className="drawer-note">
                <IconInfo size={14}/>
                <span>{t('q.note')}</span>
              </div>
              <button className="btn btn-primary btn-block" type="button" onClick={onInstall}>
                <IconDownload size={16}/>
                {t('q.installCount', {count: queueItems.length})}
              </button>
              <button className="btn btn-ghost btn-block" type="button" onClick={onClear}>
                <IconTrash size={15}/>
                {t('q.clear')}
              </button>
            </footer>
          </>
        ) : (
          <div className="queue-empty">
            <span className="queue-empty-icon"><IconQueue size={30}/></span>
            <h3>{t('q.emptyTitle')}</h3>
            <p>{t('q.emptyText')}</p>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                onClose()
                onBrowse()
              }}
            >
              {t('q.toCatalog')}
              <IconArrowRight size={16}/>
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
