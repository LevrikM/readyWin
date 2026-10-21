import type {TranslationKey} from './i18n'

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

const CODE_KEYS: Record<string, TranslationKey> = {
  done: 'inst.done',
  withErrors: 'inst.withErrors',
  noResult: 'inst.noResult',
  noLog: 'inst.noLog',
  uacCancelled: 'inst.uacCancelled',
  cancelled: 'inst.cancelled',
}

const UPGRADE_CODE_KEYS: Record<string, TranslationKey> = {
  done: 'inst.up.done',
  withErrors: 'inst.up.withErrors',
  noResult: 'inst.up.noResult',
  noLog: 'inst.noLog',
  uacCancelled: 'inst.uacCancelled',
  cancelled: 'inst.up.cancelled',
}

const COUNTED_KEYS: ReadonlyArray<TranslationKey> = [
  'inst.done',
  'inst.withErrors',
  'inst.cancelled',
  'inst.up.done',
  'inst.up.withErrors',
  'inst.up.cancelled',
]

export type InstallResultCounts = {
  code?: string
  /** 'upgrade' switches the wording from install to update */
  mode?: 'install' | 'upgrade'
  ok: number
  total: number
  skipped?: number
  added?: number
  removed?: number
}

export function installResultText(t: Translate, counts: InstallResultCounts): string {
  const table = counts.mode === 'upgrade' ? UPGRADE_CODE_KEYS : CODE_KEYS
  const key = counts.code ? table[counts.code] : undefined
  let text: string
  if (!key) {
    text = t(counts.mode === 'upgrade' ? 'inst.up.noResult' : 'inst.noResult')
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
