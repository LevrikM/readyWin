import {readFileSync, writeFileSync} from 'node:fs'

const path = 'shared/catalog.json'
const catalog = JSON.parse(readFileSync(path, 'utf8'))

const groups = {
  system: ['Components', 'Runtime components and system tools a clean Windows usually lacks.'],
  browsers: ['Browsers', 'Mainstream web browsers with sync, extensions and privacy options.'],
  communication: ['Communication', 'Messengers, video calls and team chat clients.'],
  media: ['Media', 'Players, audio editors and video tools for everyday use.'],
  gaming: ['Games', 'Game launchers, stores and streaming clients.'],
  development: ['Development', 'Editors, toolchains, containers and database clients.'],
  cli: ['Console', 'Shells, package managers and command-line tools.'],
  ai: ['AI', 'Assistants, local models and environments for working with AI.'],
  office: ['Office', 'Documents, notes, PDF readers and reference managers.'],
  utilities: ['Utilities', 'Archivers, file managers, monitoring, remote access and encryption tools.'],
  creative: ['Creative', 'Graphics, 3D, video editing and design tools.'],
  security: ['Security', 'Antivirus, encryption and network analysis tools.'],
}

const presets = {
  base: ['Base', 'What a fresh Windows needs first: browser, messenger, player and archiver.'],
  development: ['Development', 'A working environment for code, containers and databases.'],
  gaming: ['Games', 'Launchers and clients for the main game stores.'],
  creative: ['Creative', 'Graphics, 3D and video toolkit for creative work.'],
  ai: ['AI', 'Agent environments, assistants and local models.'],
}

let changed = 0
for (const group of catalog.groups) {
  const entry = groups[group.id]
  if (!entry) throw new Error(`no English name for group ${group.id}`)
  group.nameEn = entry[0]
  group.descriptionEn = entry[1]
  changed++
}
for (const preset of catalog.presets) {
  const entry = presets[preset.id]
  if (!entry) throw new Error(`no English name for preset ${preset.id}`)
  preset.nameEn = entry[0]
  preset.descriptionEn = entry[1]
  changed++
}

writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`groups: ${catalog.groups.length}, presets: ${catalog.presets.length}, updated: ${changed}`)
