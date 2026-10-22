import {useEffect, useRef} from 'react'
import type {Catalog, Item, ScanResult} from '../types'
import {formatSize} from '../format'
import {useI18n} from '../i18n'
import {groupName} from '../catalogText'
import {bridge} from '../bridge'
import {IconCopy, IconExternal, IconInfo, IconPlus, IconRefresh, IconTrash, IconX} from '../uiIcons'
import {IconTile} from './Primitives'

export function ItemDialog({
  item,
  catalog,
  scan,
  queued,
  onClose,
  onAdd,
  onRemove,
  onUninstall,
  onRepair,
  onToast,
}: {
  item: Item | null
  catalog: Catalog
  scan: ScanResult | null
  queued: boolean
  onClose: () => void
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onUninstall: (id: string) => void
  onRepair: (id: string) => void
  onToast: (message: string) => void
}) {
  const {lang, t} = useI18n()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!item) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  const group = catalog.groups.find((entry) => entry.id === item.group)
  const installed = scan?.installed[item.id]
  const description = lang === 'uk' ? item.description : (item.descriptionEn || item.description)
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id)
      onToast(t('dlg.copied'))
    } catch {
      onToast(t('dlg.copyFail'))
    }
  }
  const openHomepage = () => {
    if (item.homepage) void bridge.openExternal(item.homepage)
  }

  return (
    <div className="dialog-layer" role="presentation" onClick={onClose}>
      <article
        className="item-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <span className="eyebrow">{group ? groupName(group, lang) : t('nav.catalog')}{item.recommended ? t('dlg.recommendedSuffix') : ''}</span>
          <button ref={closeRef} className="icon-button dialog-close" type="button" onClick={onClose} aria-label={t('action.close')}>
            <IconX size={18}/>
          </button>
        </header>

        <div className="dialog-body">
          <div className="dialog-title-row">
            <IconTile icon={item.icon} size={58}/>
            <div className="dialog-title-copy">
              <h2 id="item-dialog-title">{item.shortName}</h2>
              <span className="dialog-publisher">{item.publisher}</span>
            </div>
            <span className={`app-state dialog-status ${installed ? 'is-installed' : queued ? 'is-queued' : ''}`}>
              <span className="status-dot"/>
              {installed ? t('status.installed') : queued ? t('action.inQueue') : t('status.notInstalled')}
            </span>
          </div>

          <p className="dialog-description">{description}</p>

          {item.note && (
            <div className="dialog-note">
              <IconInfo size={16}/>
              <span>{item.note}</span>
            </div>
          )}

          <div className="dialog-facts">
            <div className="dialog-fact">
              <span className="dialog-fact-label">{t('dlg.category')}</span>
              <span className="dialog-fact-value">{group ? groupName(group, lang) : '—'}</span>
            </div>
            <div className="dialog-fact">
              <span className="dialog-fact-label">{t('dlg.size')}</span>
              <span className="dialog-fact-value mono">≈ {formatSize(item.sizeMb)}</span>
            </div>
            <div className="dialog-fact">
              <span className="dialog-fact-label">{installed ? t('dlg.version') : t('dlg.source')}</span>
              <span className="dialog-fact-value mono">{installed?.version || 'winget'}</span>
            </div>
          </div>

          {item.tags.length > 0 && (
            <div className="dialog-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="dialog-tag">{tag}</span>
              ))}
            </div>
          )}

          {item.homepage && (
            <button className="text-button dialog-link" type="button" onClick={openHomepage}>
              <IconExternal size={14}/>
              {t('dlg.homepage')}
            </button>
          )}

          <div className="dialog-package">
            <span className="dialog-fact-label">{t('dlg.packageId')}</span>
            <div className="dialog-package-line">
              <code>{item.id}</code>
              <button className="icon-button" type="button" onClick={copyId} title={t('action.copyId')} aria-label={t('action.copyId')}>
                <IconCopy size={15}/>
              </button>
            </div>
          </div>
        </div>

        <footer className="dialog-foot">
          <div className="dialog-foot-note">
            <IconInfo size={14}/>
            <span>
              {installed ? t('dlg.footInstalled') : t('dlg.footQueue')}
            </span>
          </div>
          <div className="dialog-actions">
            <button className="btn btn-ghost" type="button" onClick={onClose}>{t('action.close')}</button>
            {installed ? (
              <>
                <button className="btn btn-secondary" type="button" onClick={() => onRepair(item.id)}>
                  <IconRefresh size={16}/>
                  {t('dlg.repair')}
                </button>
                <button className="btn btn-danger" type="button" onClick={() => onUninstall(item.id)}>
                  <IconTrash size={16}/>
                  {t('dlg.uninstall')}
                </button>
              </>
            ) : queued ? (
              <button className="btn btn-secondary" type="button" onClick={() => onRemove(item.id)}>
                <IconX size={16}/>
                {t('dlg.remove')}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => onAdd(item.id)}>
                <IconPlus size={16}/>
                {t('action.addToQueue')}
              </button>
            )}
          </div>
        </footer>
      </article>
    </div>
  )
}
