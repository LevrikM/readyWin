import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const catalogPath = fileURLToPath(new URL('../shared/catalog.json', import.meta.url))
const force = process.argv.includes('--all')

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

function wingetShow(id) {
  try {
    return execFileSync(
      'cmd.exe',
      ['/c', `chcp 65001>nul && winget show --id ${id} --exact --source winget --accept-source-agreements --disable-interactivity`],
      { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26, timeout: 60000 },
    )
  } catch {
    return ''
  }
}

function field(text, label) {
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : ''
}

function tidy(value) {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= 300) return clean
  const cut = clean.slice(0, 297)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 180 ? cut.slice(0, lastSpace) : cut) + '…'
}

let touched = 0
let missing = 0

for (const item of catalog.items) {
  if (!force && item.descriptionEn && item.homepage) continue
  const output = wingetShow(item.id)
  if (!output) {
    missing++
    console.log(`— ${item.id}: манифест не знайдено`)
    continue
  }
  const installerAt = output.search(/^\s*Installer:/m)
  const header = installerAt > 0 ? output.slice(0, installerAt) : output
  const description = tidy(field(header, 'Short Description') || field(header, 'Description'))
  const homepage = field(header, 'Homepage') || field(header, 'Publisher Url')
  if (description) item.descriptionEn = description
  if (/^https?:\/\//i.test(homepage)) item.homepage = homepage
  if (description || item.homepage) touched++
  console.log(`✓ ${item.id}${item.homepage ? ' · ' + item.homepage : ''}`)
}

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
console.log(`\nОновлено: ${touched}. Без манифесту: ${missing}. Всього позицій: ${catalog.items.length}.`)
