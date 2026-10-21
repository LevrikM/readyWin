import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const catalogPath = fileURLToPath(new URL('../shared/catalog.json', import.meta.url))
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

const problems = []
const groupIds = new Set(catalog.groups.map((g) => g.id))
const indexes = new Set()
for (const group of catalog.groups) {
  if (indexes.has(group.index)) problems.push(`duplicate group index ${group.index}`)
  indexes.add(group.index)
  for (const key of ['id', 'name', 'nameEn', 'description', 'descriptionEn', 'index']) {
    if (!group[key]) problems.push(`group ${group.id} missing ${key}`)
  }
}

const ids = new Set()
const required = ['id', 'name', 'shortName', 'publisher', 'description', 'descriptionEn', 'homepage',
  'group', 'icon', 'tags', 'sizeMb', 'recommended', 'match']
for (const item of catalog.items) {
  if (ids.has(item.id)) problems.push(`duplicate item id ${item.id}`)
  ids.add(item.id)
  for (const key of required) {
    const value = item[key]
    if (value === undefined || value === null || value === '') problems.push(`${item.id}: missing ${key}`)
  }
  if (!groupIds.has(item.group)) problems.push(`${item.id}: unknown group ${item.group}`)
  if (!Array.isArray(item.tags) || item.tags.length === 0) problems.push(`${item.id}: empty tags`)
  if (!Array.isArray(item.match) || item.match.length === 0) {
    const legacyNoMatch = new Set(['Microsoft.WSL'])
    if (item.group !== 'system' && !legacyNoMatch.has(item.id)) problems.push(`${item.id}: empty match`)
  }
  if (!Number.isInteger(item.sizeMb) || item.sizeMb <= 0) problems.push(`${item.id}: bad sizeMb ${item.sizeMb}`)
  if (typeof item.descriptionEn === 'string' && item.descriptionEn.length > 320)
    problems.push(`${item.id}: descriptionEn too long (${item.descriptionEn.length})`)
}

for (const preset of catalog.presets) {
  for (const id of preset.items) if (!ids.has(id)) problems.push(`preset ${preset.id}: unknown item ${id}`)
}

console.log(`items=${catalog.items.length} groups=${catalog.groups.length} presets=${catalog.presets.length}`)
console.log(`group order: ${catalog.groups.map((g) => `${g.index}:${g.id}`).join(', ')}`)
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`)
  for (const p of problems) console.log(' - ' + p)
  process.exitCode = 1
} else {
  console.log('OK: no structural problems')
}
