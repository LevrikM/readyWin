import type {SystemCheck, SystemInfo} from './types'
import type {TranslationKey} from './i18n'
import {formatGb, formatRam} from './format'

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

const CHECK_LABELS: Record<string, TranslationKey> = {
  winget: 'check.winget',
  secureboot: 'check.secureboot',
  defender: 'check.defender',
  disk: 'check.disk',
  memory: 'check.memory',
  network: 'check.network',
}

export function checkLabel(check: SystemCheck, t: Translate, productName?: string): string {
  if (check.kind === 'runtime') return productName ?? check.label
  const key = CHECK_LABELS[check.id]
  return key ? t(key) : check.label
}

export function checkDetail(
  check: SystemCheck,
  t: Translate,
  ctx: {system?: SystemInfo; version?: string},
): string {
  if (check.id === 'winget') {
    return ctx.system?.winget ? t('check.version', {version: ctx.system.winget}) : t('check.notFound')
  }
  if (check.id === 'secureboot' || check.id === 'defender') {
    if (check.status === 'ok') return t('check.on')
    if (check.status === 'warn') return t('check.off')
    return t('check.unknown')
  }
  if (check.id === 'disk') {
    if (!ctx.system) return check.detail
    return t('check.diskDetail', {
      free: formatGb(ctx.system.diskFreeGb),
      total: formatGb(ctx.system.diskTotalGb),
    })
  }
  if (check.id === 'memory') {
    if (!ctx.system) return check.detail
    return t('check.memoryDetail', {
      total: formatRam(ctx.system.ramTotalGb),
      free: formatRam(ctx.system.ramFreeGb),
    })
  }
  if (check.id === 'network') {
    return check.status === 'ok' ? t('check.networkOk') : t('check.networkFail')
  }
  if (check.kind === 'runtime') {
    return ctx.version ? t('check.version', {version: ctx.version}) : t('check.notFound')
  }
  return check.detail
}
