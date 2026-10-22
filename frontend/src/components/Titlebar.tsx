import type {CSSProperties} from 'react'
import type {Page} from '../types'
import {useI18n} from '../i18n'
import type {TranslationKey} from '../i18n'
import {
  IconWindowClose,
  IconWindowMaximize,
  IconWindowMinimize,
  IconWindowRestore,
} from '../uiIcons'

const pageLabels: Record<Page, TranslationKey> = {
  overview: 'nav.overview',
  catalog: 'nav.catalog',
  health: 'nav.health',
  system: 'nav.system',
  history: 'nav.history',
}

export function Titlebar({
  page,
  maximized,
  onMinimise,
  onToggleMaximise,
  onClose,
}: {
  page: Page
  maximized: boolean
  onMinimise: () => void
  onToggleMaximise: () => void
  onClose: () => void
}) {
  const dragStyle = {'--wails-draggable': 'drag'} as CSSProperties
  const {t} = useI18n()
  return (
    <header className="titlebar">
      {/* Drag region on inner blocks only: a zone on the header swallows window-control clicks. */}
      <div className="titlebar-brand" style={dragStyle} onDoubleClick={onToggleMaximise}>
        <span className="titlebar-dot"/>
        <span>READYWIN</span>
      </div>
      <div className="titlebar-drag" style={dragStyle} onDoubleClick={onToggleMaximise}>
        <span className="titlebar-page">{t(pageLabels[page])}</span>
      </div>
      <div className="window-controls">
        <button className="window-button" type="button" title={t('win.minimise')} aria-label={t('win.minimise')} onClick={onMinimise}>
          <IconWindowMinimize size={16}/>
        </button>
        <button
          className="window-button"
          type="button"
          title={maximized ? t('win.restore') : t('win.maximise')}
          aria-label={maximized ? t('win.restore') : t('win.maximise')}
          onClick={onToggleMaximise}
        >
          {maximized ? <IconWindowRestore size={16}/> : <IconWindowMaximize size={16}/>}
        </button>
        <button
          className="window-button window-button-close"
          type="button"
          title={t('win.close')}
          aria-label={t('win.close')}
          onClick={onClose}
        >
          <IconWindowClose size={16}/>
        </button>
      </div>
    </header>
  )
}
