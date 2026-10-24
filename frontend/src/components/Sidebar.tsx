import type {Page} from '../types'
import {useI18n} from '../i18n'
import type {TranslationKey} from '../i18n'
import {
  IconCatalog,
  IconHistory,
  IconOverview,
  IconQueue,
  IconSettings,
  IconShield,
  IconSystem,
  LogoMark,
} from '../uiIcons'

const navItems: Array<{page: Page; label: TranslationKey; icon: typeof IconOverview}> = [
  {page: 'overview', label: 'nav.overview', icon: IconOverview},
  {page: 'catalog', label: 'nav.catalog', icon: IconCatalog},
  {page: 'health', label: 'nav.health', icon: IconShield},
  {page: 'system', label: 'nav.system', icon: IconSystem},
  {page: 'history', label: 'nav.history', icon: IconHistory},
  {page: 'settings', label: 'nav.settings', icon: IconSettings},
]

export function Sidebar({
  page,
  onNavigate,
  installedCount,
  totalCount,
  queueCount,
  onOpenQueue,
  version,
}: {
  page: Page
  onNavigate: (page: Page) => void
  installedCount: number
  totalCount: number
  queueCount: number
  onOpenQueue: () => void
  version: string
}) {
  const {t} = useI18n()
  const percent = totalCount > 0 ? Math.round((installedCount / totalCount) * 100) : 0

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
        <button type="button" className="footer-version mono" onClick={() => onNavigate('settings')} title={t('nav.settings')}>
          v{version}
        </button>
      </div>
    </aside>
  )
}
