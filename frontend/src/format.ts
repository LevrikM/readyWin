export type Lang = 'uk' | 'en' | 'de' | 'ru'

const LOCALES: Record<Lang, string> = {
  uk: 'uk-UA',
  en: 'en-GB',
  de: 'de-DE',
  ru: 'ru-RU',
}

const UNITS: Record<Lang, {gb: string; mb: string; sec: string; min: string; hour: string}> = {
  uk: {gb: 'ГБ', mb: 'МБ', sec: 'с', min: 'хв', hour: 'год'},
  en: {gb: 'GB', mb: 'MB', sec: 's', min: 'min', hour: 'h'},
  de: {gb: 'GB', mb: 'MB', sec: 's', min: 'Min', hour: 'Std'},
  ru: {gb: 'ГБ', mb: 'МБ', sec: 'с', min: 'мин', hour: 'ч'},
}

const NOT_SCANNED: Record<Lang, string> = {
  uk: 'Ще не сканували',
  en: 'Not scanned yet',
  de: 'Noch nicht gescannt',
  ru: 'Ещё не сканировалось',
}

const JUST_NOW: Record<Lang, string> = {
  uk: 'Щойно',
  en: 'Just now',
  de: 'Gerade eben',
  ru: 'Только что',
}

const AGO: Record<Lang, (value: string, unit: string) => string> = {
  uk: (value, unit) => `${value} ${unit} тому`,
  en: (value, unit) => `${value} ${unit} ago`,
  de: (value, unit) => `vor ${value} ${unit}`,
  ru: (value, unit) => `${value} ${unit} назад`,
}

let lang: Lang = 'uk'

export function setFormatLang(next: Lang): void {
  lang = next
}

export function formatLocale(): string {
  return LOCALES[lang]
}

function units() {
  return UNITS[lang]
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function formatCount(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`
}

export function formatDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALES[lang], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function formatDay(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALES[lang], {day: '2-digit'}).format(date)
}

export function formatMonth(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALES[lang], {month: 'long'}).format(date)
}

export function formatClock(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALES[lang], {hour: '2-digit', minute: '2-digit'}).format(date)
}

export function formatDuration(seconds: number): string {
  const unit = units()
  if (seconds < 60) return `${seconds} ${unit.sec}`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest > 0 ? `${minutes} ${unit.min} ${rest} ${unit.sec}` : `${minutes} ${unit.min}`
}

export function formatSize(mb: number): string {
  const unit = units()
  if (mb >= 1024) {
    const gb = mb / 1024
    return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} ${unit.gb}`
  }
  return `${mb} ${unit.mb}`
}

export function formatRam(gb: number): string {
  if (!Number.isFinite(gb) || gb <= 0) return '—'
  return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} ${units().gb}`
}

export function formatGb(gb: number): string {
  if (!Number.isFinite(gb) || gb <= 0) return '—'
  return `${gb.toFixed(1)} ${units().gb}`
}

export function formatUnit(kind: 'gb' | 'mb'): string {
  return units()[kind]
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function relativeScan(value: string | undefined): string {
  if (!value) return NOT_SCANNED[lang]
  const date = new Date(value)
  const diff = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (Number.isNaN(diff)) return NOT_SCANNED[lang]
  if (diff < 10) return JUST_NOW[lang]
  const unit = units()
  if (diff < 60) return AGO[lang](`${diff}`, unit.sec)
  if (diff < 3600) return AGO[lang](`${Math.floor(diff / 60)}`, unit.min)
  if (diff < 86400) return AGO[lang](`${Math.floor(diff / 3600)}`, unit.hour)
  return formatDateTime(value)
}
