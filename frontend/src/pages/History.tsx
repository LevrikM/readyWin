import {useState} from 'react'
import type {HistoryEntry} from '../types'
import {formatClock, formatDay, formatDuration, formatMonth, relativeScan} from '../format'
import {useI18n} from '../i18n'
import type {TranslationKey} from '../i18n'
import {installResultText} from '../installText'
import {IconArrowRight, IconCheck, IconHistory, IconTrash, IconX} from '../uiIcons'

const statusLabels: Record<HistoryEntry['status'], TranslationKey> = {
  success: 'hist.status.success',
  failed: 'hist.status.failed',
  cancelled: 'hist.status.cancelled',
}

export function HistoryPage({
  history,
  onClear,
  onNavigateCatalog,
}: {
  history: HistoryEntry[]
  onClear: () => void
  onNavigateCatalog: () => void
}) {
  const {t} = useI18n()
  const [confirmClear, setConfirmClear] = useState(false)
  const okTotal = history.reduce(
    (sum, entry) => sum + entry.items.filter((item) => item.status === 'ok').length,
    0,
  )
  const failedTotal = history.reduce(
    (sum, entry) => sum + entry.items.filter((item) => item.status === 'failed').length,
    0,
  )

  return (
    <div className="page history-page">
      <div className="page-head">
        <div className="page-head-copy">
          <div className="eyebrow">{t('hist.eyebrow')}</div>
          <h1>{t('hist.title')}</h1>
          <p className="page-intro">
            {t('hist.intro')}
          </p>
        </div>
        {history.length > 0 && (
          <div className="page-head-actions">
            {confirmClear ? (
              <div className="confirm-actions">
                <span>{t('hist.clearConfirm')}</span>
                <button
                  className="btn btn-danger btn-small"
                  type="button"
                  onClick={() => {
                    onClear()
                    setConfirmClear(false)
                  }}
                >
                  {t('hist.clearYes')}
                </button>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setConfirmClear(false)}>
                  <IconX size={14}/>
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={() => setConfirmClear(true)}>
                <IconTrash size={16}/>
                {t('hist.clear')}
              </button>
            )}
          </div>
        )}
      </div>

      {history.length > 0 ? (
        <>
          <div className="journal-summary">
            <div>
              <span className="strip-label">{t('hist.stat.runs')}</span>
              <strong>{history.length}</strong>
            </div>
            <div>
              <span className="strip-label">{t('hist.stat.installed')}</span>
              <strong>{okTotal}</strong>
            </div>
            <div>
              <span className="strip-label">{t('hist.stat.errors')}</span>
              <strong className={failedTotal > 0 ? 'is-warning' : ''}>{failedTotal}</strong>
            </div>
            <div>
              <span className="strip-label">{t('hist.stat.last')}</span>
              <strong className="journal-last">{relativeScan(history[0].startedAt)}</strong>
            </div>
          </div>

          <div className="journal-list">
            {history.map((entry) => (
              <JournalEntry key={entry.id} entry={entry}/>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state journal-empty">
          <div className="empty-illustration">
            <IconHistory size={38}/>
            <span className="empty-illustration-line"/>
          </div>
          <h3>{t('hist.emptyTitle')}</h3>
          <p>
            {t('hist.emptyText')}
          </p>
          <button className="btn btn-primary" type="button" onClick={onNavigateCatalog}>
            {t('hist.toCatalog')}
            <IconArrowRight size={16}/>
          </button>
        </div>
      )}
    </div>
  )
}

function JournalEntry({entry}: {entry: HistoryEntry}) {
  const {t, tc} = useI18n()
  const day = formatDay(entry.startedAt)
  const month = formatMonth(entry.startedAt)
  const time = formatClock(entry.startedAt)
  const ok = entry.items.filter((item) => item.status === 'ok').length
  const failed = entry.items.filter((item) => item.status === 'failed').length
  const skipped = entry.items.filter((item) => item.status === 'skipped').length
  const newApps = entry.newApps ?? []
  const resultText = entry.code
    ? installResultText(t, {code: entry.code, ok, total: entry.items.length})
    : entry.message
  const showDiff = typeof entry.before === 'number' && typeof entry.after === 'number' && entry.after !== entry.before
  return (
    <article className={`journal-entry is-${entry.status}`}>
      <div className="journal-date">
        <strong>{day}</strong>
        <span>{month}</span>
        <em className="mono">{time}</em>
      </div>
      <div className="journal-main">
        <div className="journal-head">
          <div>
            <h3>
              {tc('noun.apps', entry.items.length)}
            </h3>
            <span className={`journal-status is-${entry.status}`}>
              <span className="status-dot"/>
              {t(statusLabels[entry.status])}
            </span>
          </div>
          <span className="journal-duration mono">{formatDuration(entry.durationSec)}</span>
        </div>
        <div className="journal-meta">
          <span>{resultText}</span>
          {failed > 0 && <span className="journal-failed">{t('hist.failedCount', {count: failed})}</span>}
          {skipped > 0 && <span>{t('hist.skippedCount', {count: skipped})}</span>}
          {failed === 0 && skipped === 0 && <span>{t('hist.okCount', {count: ok})}</span>}
          {showDiff && <span className="journal-diff mono">{t('q.beforeAfter', {before: entry.before, after: entry.after})}</span>}
          {newApps.length > 0 && <span className="journal-added">{t('hist.added', {list: newApps.join(', ')})}</span>}
        </div>
        <div className="journal-chips">
          {entry.items.map((item) => (
            <span key={`${entry.id}-${item.id}`} className={`journal-chip is-${item.status}`}>
              {item.status === 'ok' ? <IconCheck size={12}/> : <span className="status-dot"/>}
              {item.name}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
