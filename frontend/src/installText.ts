import type {InstallMode} from './types'
import type {TranslationKey} from './i18n'

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

const CODE_KEYS: Record<string, TranslationKey> = {
  done: 'inst.done',
  withErrors: 'inst.withErrors',
  noResult: 'inst.noResult',
  noLog: 'inst.noLog',
  uacCancelled: 'inst.uacCancelled',
  launcherFailed: 'inst.launcherFailed',
  cancelled: 'inst.cancelled',
}

const UPGRADE_CODE_KEYS: Record<string, TranslationKey> = {
  done: 'inst.up.done',
  withErrors: 'inst.up.withErrors',
  noResult: 'inst.up.noResult',
  noLog: 'inst.noLog',
  uacCancelled: 'inst.uacCancelled',
  launcherFailed: 'inst.launcherFailed',
  cancelled: 'inst.up.cancelled',
}

const UNINSTALL_CODE_KEYS: Record<string, TranslationKey> = {
  done: 'inst.un.done',
  withErrors: 'inst.un.withErrors',
  noResult: 'inst.un.noResult',
  noLog: 'inst.noLog',
  uacCancelled: 'inst.uacCancelled',
  launcherFailed: 'inst.launcherFailed',
  cancelled: 'inst.un.cancelled',
}

const REPAIR_CODE_KEYS: Record<string, TranslationKey> = {
  done: 'inst.rep.done',
  withErrors: 'inst.rep.withErrors',
  noResult: 'inst.rep.noResult',
  noLog: 'inst.noLog',
  uacCancelled: 'inst.uacCancelled',
  launcherFailed: 'inst.launcherFailed',
  cancelled: 'inst.rep.cancelled',
}

const TABLES: Record<InstallMode, Record<string, TranslationKey>> = {
  install: CODE_KEYS,
  upgrade: UPGRADE_CODE_KEYS,
  uninstall: UNINSTALL_CODE_KEYS,
  repair: REPAIR_CODE_KEYS,
}

const FALLBACK_RESULT: Record<InstallMode, TranslationKey> = {
  install: 'inst.noResult',
  upgrade: 'inst.up.noResult',
  uninstall: 'inst.un.noResult',
  repair: 'inst.rep.noResult',
}

const COUNTED_KEYS: ReadonlyArray<TranslationKey> = [
  'inst.done',
  'inst.withErrors',
  'inst.cancelled',
  'inst.up.done',
  'inst.up.withErrors',
  'inst.up.cancelled',
  'inst.un.done',
  'inst.un.withErrors',
  'inst.un.cancelled',
  'inst.rep.done',
  'inst.rep.withErrors',
  'inst.rep.cancelled',
]

export type InstallResultCounts = {
  code?: string
  mode?: InstallMode
  ok: number
  total: number
  skipped?: number
  added?: number
  removed?: number
}

export function installResultText(t: Translate, counts: InstallResultCounts): string {
  const mode = counts.mode ?? 'install'
  const table = TABLES[mode] ?? CODE_KEYS
  const key = counts.code ? table[counts.code] : undefined
  let text: string
  if (!key) {
    text = t(FALLBACK_RESULT[mode] ?? 'inst.noResult')
  } else if (COUNTED_KEYS.includes(key)) {
    text = t(key, {ok: counts.ok, total: counts.total})
  } else {
    text = t(key)
  }
  if (counts.skipped) text += t('inst.skipped', {count: counts.skipped})
  if (counts.added) text += t('inst.newApps', {count: counts.added})
  if (counts.removed) text += t('inst.removed', {count: counts.removed})
  return text
}
