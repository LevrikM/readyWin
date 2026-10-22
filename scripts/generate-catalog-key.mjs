#!/usr/bin/env node
// Creates the Ed25519 key pair used to sign the OTA catalog. The private key
// stays in .keys/ (gitignored). Back it up: losing it means you must ship a new
// app build with a new public key before OTA updates can be signed again.
import {generateKeyPairSync} from 'node:crypto'
import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, '.keys')
const keyPath = join(dir, 'catalog-signing-key.pem')
const pubPath = join(dir, 'catalog-public-key.txt')

if (existsSync(keyPath)) {
  console.error(`Key already exists: ${keyPath}`)
  console.error('Remove it manually if you really want to rotate the key.')
  process.exit(1)
}

mkdirSync(dir, {recursive: true})
const {publicKey, privateKey} = generateKeyPairSync('ed25519')
writeFileSync(keyPath, privateKey.export({type: 'pkcs8', format: 'pem'}), {mode: 0o600})
const jwk = publicKey.export({format: 'jwk'})
writeFileSync(pubPath, jwk.x + '\n')
console.log(`Created ${keyPath}`)
console.log(`Public key (base64url): ${jwk.x}`)
console.log('Back up the private key and keep it out of git.')
