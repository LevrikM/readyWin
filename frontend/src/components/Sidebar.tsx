import {useEffect, useRef, useState} from 'react'
import type {Page} from '../types'
import {LANGS, useI18n} from '../i18n'
import type {TranslationKey} from '../i18n'
import {
  IconCatalog,
  IconHistory,
  IconMoon,
  IconOverview,
  IconQueue,
  IconShield,
  IconSun,
  IconSystem,
  LogoMark,
} from '../uiIcons'

const navItems: Array<{page: Page; label: TranslationKey; icon: typeof IconOverview}> = [
  {page: 'overview', label: 'nav.overview', icon: IconOverview},
  {page: 'catalog', label: 'nav.catalog', icon: IconCatalog},
  {page: 'health', label: 'nav.health', icon: IconShield},
  {page: 'system', label: 'nav.system', icon: IconSystem},
  {page: 'history', label: 'nav.history', icon: IconHistory},
]

export function Sidebar({
  page,
  onNavigate,
  installedCount,
  totalCount,
  queueCount,
  onOpenQueue,
  theme,
  onToggleTheme,
  version,
  onOpenDataFolder,
}: {
  page: Page
  onNavigate: (page: Page) => void
  installedCount: number
  totalCount: number
  queueCount: number
  onOpenQueue: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  version: string
  onOpenDataFolder: () => void
}) {
  const {lang, setLang, t} = useI18n()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const percent = totalCount > 0 ? Math.round((installedCount / totalCount) * 100) : 0
  const current = LANGS.find((entry) => entry.code === lang) ?? LANGS[0]

  useEffect(() => {
    if (!langOpen) return
    const onPointer = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) setLangOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [langOpen])

  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoMark size={32}/>
        <div className="brand-copy">
          <span className="brand-name">ReadyWin</span>
          <span className="brand-sub">{t('app.tagline')}</span>
        </div>
      </div>

      <div className="side-label">{t('nav.workspace')}</div>
      <nav className="nav" aria-label={t('nav.aria')}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.page}
              type="button"
              className={`nav-item ${page === item.page ? 'is-active' : ''}`}
              onClick={() => onNavigate(item.page)}
            >
              <Icon size={18}/>
              <span>{t(item.label)}</span>
              {item.page === 'catalog' && totalCount > 0 && <span className="nav-count">{totalCount}</span>}
              {page === item.page && <span className="nav-active-mark"/>}
            </button>
          )
        })}
      </nav>

      <div className="side-spacer"/>

      <div className="sidebar-health">
        <div className="health-head">
          <span className="health-title"><span className="health-dot"/>{t('nav.system')}</span>
          <span className="health-percent mono">{percent}%</span>
        </div>
        <div className="health-bar" aria-hidden="true">
          <span style={{width: `${percent}%`}}/>
        </div>
        <div className="health-caption">
          {installedCount} {t('side.healthCaption', {total: totalCount})}
        </div>
      </div>

      <button className="queue-button" type="button" onClick={onOpenQueue}>
        <IconQueue size={18}/>
        <span>{t('queue.title')}</span>
        <span className={`queue-count ${queueCount === 0 ? 'is-empty' : ''}`}>{queueCount}</span>
      </button>

      <div className="sidebar-footer">
        <div className="footer-tools">
          <button
            type="button"
            className="icon-button"
            title={theme === 'light' ? t('theme.toDark') : t('theme.toLight')}
            aria-label={theme === 'light' ? t('theme.enableDark') : t('theme.enableLight')}
            onClick={onToggleTheme}
          >
            {theme === 'light' ? <IconMoon size={17}/> : <IconSun size={17}/>}
          </button>
          <div className="lang-switch" ref={langRef}>
            <button
              type="button"
              className="lang-button"
              title={t('lang.title')}
              aria-label={t('lang.title')}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              onClick={() => setLangOpen((value) => !value)}
            >
              {current.short}
            </button>
            {langOpen && (
              <ul className="lang-menu" role="listbox" aria-label={t('lang.title')}>
                {LANGS.map((entry) => (
                  <li key={entry.code} role="option" aria-selected={entry.code === lang}>
                    <button
                      type="button"
                      className={`lang-option ${entry.code === lang ? 'is-active' : ''}`}
                      onClick={() => {
                        setLang(entry.code)
                        setLangOpen(false)
                      }}
                    >
                      <span>{entry.label}</span>
                      <span className="lang-option-short">{entry.short}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button type="button" className="footer-version mono" onClick={onOpenDataFolder} title={t('side.openData')}>
          v{version}
        </button>
      </div>
    </aside>
  )
}
