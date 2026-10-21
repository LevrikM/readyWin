import type {Group, Preset} from './types'
import type {Lang} from './format'

export function groupName(group: Group, lang: Lang): string {
  return lang === 'uk' ? group.name : group.nameEn || group.name
}

export function groupDescription(group: Group, lang: Lang): string {
  return lang === 'uk' ? group.description : group.descriptionEn || group.description
}

export function presetName(preset: Preset, lang: Lang): string {
  return lang === 'uk' ? preset.name : preset.nameEn || preset.name
}

export function presetDescription(preset: Preset, lang: Lang): string {
  return lang === 'uk' ? preset.description : preset.descriptionEn || preset.description
}
