import type {
  AppUpdateDownload,
  AppUpdateInfo,
  AppUpdateProgress,
  AppUpdateSettings,
} from '../types'
import {formatDateTime} from '../format'
import {LANGS, useI18n} from '../i18n'
import {
  IconCheck,
  IconDownload,
  IconExternal,
  IconMoon,
  IconRefresh,
  IconSun,
  Spinner,
} from '../uiIcons'
import {SectionHeader, StatusMark} from '../components/Primitives'

export function SettingsPage({
  version,
  theme,
  appUpdate,
  appUpdateLoading,
  appUpdateDownload,
  appUpdateProgress,
  appUpdateDownloading,
  applyingUpdate,
  updateSettings,
  updateSkipped,
  onToggleTheme,
  onCheckAppUpdate,
  onOpenAppUpdate,
  onRunAppUpdate,
  onChangeUpdateSettings,
  onOpenUpdatesFolder,
  onSkipAppUpdate,
  onUnskipAppUpdate,
  onOpenDataFolder,
}: {
  version: string
  theme: 'light' | 'dark'
  appUpdate: AppUpdateInfo | null
  appUpdateLoading: boolean
  appUpdateDownload: AppUpdateDownload | null
  appUpdateProgress: AppUpdateProgress | null
  appUpdateDownloading: boolean
  applyingUpdate: boolean
  updateSettings: AppUpdateSettings
  updateSkipped: boolean
  onToggleTheme: () => void
  onCheckAppUpdate: () => void
  onOpenAppUpdate: () => void
  onRunAppUpdate: () => void
  onChangeUpdateSettings: (autoCheck: boolean, autoDownload: boolean) => void
  onOpenUpdatesFolder: () => void
  onSkipAppUpdate: () => void
  onUnskipAppUpdate: () => void
  onOpenDataFolder: () => void
}) {
  const {lang, setLang, t} = useI18n()

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('settings.eyebrow')}</span>
          <h1>{t('settings.title')}</h1>
          <p className="page-sub">{t('settings.sub')}</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="panel settings-section">
          <SectionHeader title={t('settings.appearance')} meta={t('settings.appearanceMeta')}/>
          <div className="settings-row">
            <div className="settings-copy">
              <strong>{t('settings.theme')}</strong>
              <span>{t('settings.themeNote')}</span>
            </div>
            <div className="theme-options" role="group" aria-label={t('settings.theme')}>
              <button
                type="button"
                className={`theme-option${theme === 'light' ? ' is-active' : ''}`}
                aria-pressed={theme === 'light'}
                onClick={() => {
                  if (theme !== 'light') onToggleTheme()
                }}
              >
                <IconSun size={16}/>
                {t('settings.themeLight')}
              </button>
              <button
                type="button"
                className={`theme-option${theme === 'dark' ? ' is-active' : ''}`}
                aria-pressed={theme === 'dark'}
                onClick={() => {
                  if (theme !== 'dark') onToggleTheme()
                }}
              >
                <IconMoon size={16}/>
                {t('settings.themeDark')}
              </button>
            </div>
          </div>
          <div className="settings-row settings-row-stack">
            <div className="settings-copy">
              <strong>{t('lang.title')}</strong>
              <span>{t('settings.langNote')}</span>
            </div>
            <div className="lang-options" role="group" aria-label={t('lang.title')}>
              {LANGS.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  className={`lang-option-lg${entry.code === lang ? ' is-active' : ''}`}
                  aria-pressed={entry.code === lang}
                  onClick={() => setLang(entry.code)}
                >
                  <span>{entry.label}</span>
                  <span className="lang-option-short mono">{entry.short}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel settings-section">
          <SectionHeader
            title={t('update.app.title')}
            meta={appUpdate?.available && appUpdate.latestVersion ? t('update.app.latest', {version: appUpdate.latestVersion}) : undefined}
          />
          <div className="catalog-status">
            <span className="mono">{t('update.app.currentVersion', {version: appUpdate?.currentVersion ?? version})}</span>
            {appUpdate?.checkedAt && (
              <span>{t('update.app.checked', {date: formatDateTime(appUpdate.checkedAt)})}</span>
            )}
          </div>
          {appUpdate?.error && (
            <div className="health-inline-error">
              {t('update.app.error')} <span className="mono">{appUpdate.error}</span>
            </div>
          )}
          {appUpdate && !appUpdate.available && !appUpdate.error && (
            <p className="catalog-note">{t('update.app.current')}</p>
          )}
          {appUpdate?.available && appUpdate.notes && (
            <details className="app-update-notes">
              <summary>{t('update.app.notes')}</summary>
              <div>{appUpdate.notes}</div>
            </details>
          )}
          {appUpdate?.available && appUpdate.checksum && (
            <div className="app-update-checksum">
              <span>{t('update.app.checksum')}</span>
              <code title={appUpdate.checksum}>{appUpdate.checksum.slice(0, 16)}…</code>
            </div>
          )}
          {appUpdateDownloading && appUpdateProgress && (
            <div className="app-update-download">
              <div className="app-update-progress" aria-hidden="true">
                <span style={{width: `${appUpdateProgress.percent}%`}}/>
              </div>
              <span className="mono">{t('update.app.downloading', {percent: appUpdateProgress.percent})}</span>
            </div>
          )}
          {appUpdateDownload && (
            <div className="app-update-verified">
              <IconCheck size={14}/>
              <span>{t('update.app.verified')}</span>
              <code title={appUpdateDownload.sha256}>{appUpdateDownload.sha256.slice(0, 12)}…</code>
            </div>
          )}
          {appUpdate?.available && (
            <>
              <button
                className="btn btn-primary btn-block"
                type="button"
                onClick={onRunAppUpdate}
                disabled={applyingUpdate || appUpdateDownloading}
              >
                <IconCheck size={15}/>
                {applyingUpdate ? t('update.app.installing') : t('update.app.install')}
              </button>
              {appUpdateDownload ? (
                <button className="btn btn-secondary btn-block" type="button" onClick={onOpenUpdatesFolder}>
                  <IconDownload size={15}/>
                  {t('update.app.openFolder')}
                </button>
              ) : (
                <button className="btn btn-secondary btn-block" type="button" onClick={onOpenAppUpdate}>
                  <IconExternal size={15}/>
                  {t('update.app.releasePage')}
                </button>
              )}
              {updateSkipped ? (
                <button className="text-button app-update-skip" type="button" onClick={onUnskipAppUpdate}>
                  {t('update.app.unskip')}
                </button>
              ) : (
                <button className="text-button app-update-skip" type="button" onClick={onSkipAppUpdate}>
                  {t('update.app.skip')}
                </button>
              )}
            </>
          )}
          <div className="switch-list">
            <label className="switch-row">
              <input
                type="checkbox"
                checked={updateSettings.autoCheck}
                onChange={(event) => onChangeUpdateSettings(event.target.checked, updateSettings.autoDownload)}
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb"/>
              </span>
              <span>{t('update.app.autoCheck')}</span>
            </label>
            <label className={`switch-row${updateSettings.autoCheck ? '' : ' is-disabled'}`}>
              <input
                type="checkbox"
                checked={updateSettings.autoDownload}
                disabled={!updateSettings.autoCheck}
                onChange={(event) => onChangeUpdateSettings(updateSettings.autoCheck, event.target.checked)}
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb"/>
              </span>
              <span>{t('update.app.autoDownload')}</span>
            </label>
          </div>
          <p className="catalog-note">{t('update.app.autoNote')}</p>
          {updateSettings.lastResult && updateSettings.lastResult.status !== 'applying' && (
            <div className="update-result">
              <StatusMark status={updateSettings.lastResult.status === 'installed' ? 'ok' : 'warn'}/>
              <div>
                <strong>
                  {updateSettings.lastResult.status === 'installed'
                    ? t('update.app.installed', {version: updateSettings.lastResult.version ?? ''})
                    : t('update.app.failed')}
                </strong>
                {updateSettings.lastResult.message && <span>{updateSettings.lastResult.message}</span>}
                <small>
                  {t('update.app.lastResult')}
                  {updateSettings.lastResult.at ? ` · ${formatDateTime(updateSettings.lastResult.at)}` : ''}
                  {updateSettings.lastResult.elevated ? ` · ${t('update.app.elevated')}` : ''}
                </small>
              </div>
            </div>
          )}
          <button
            className="btn btn-secondary btn-block"
            type="button"
            onClick={onCheckAppUpdate}
            disabled={appUpdateLoading}
          >
            {appUpdateLoading ? <Spinner size={15}/> : <IconRefresh size={15}/>}
            {appUpdateLoading ? t('update.app.checking') : t('update.app.check')}
          </button>
          <p className="catalog-note">{t('update.app.note')}</p>
        </section>

        <section className="panel settings-section">
          <SectionHeader title={t('settings.data')} meta={t('settings.dataMeta')}/>
          <div className="settings-copy settings-copy-block">
            <strong>{t('settings.dataFolder')}</strong>
            <span>{t('settings.dataNote')}</span>
          </div>
          <button className="btn btn-secondary btn-block" type="button" onClick={onOpenDataFolder}>
            <IconExternal size={15}/>
            {t('side.openData')}
          </button>
        </section>

        <section className="panel settings-section">
          <SectionHeader title={t('settings.about')} meta={`v${version}`}/>
          <div className="catalog-status">
            <span className="mono">ReadyWin {version}</span>
            <span>{t('settings.aboutNote')}</span>
          </div>
          <button className="btn btn-secondary btn-block" type="button" onClick={onOpenAppUpdate}>
            <IconExternal size={15}/>
            {t('settings.releaseNotes')}
          </button>
        </section>
      </div>
    </div>
  )
}
