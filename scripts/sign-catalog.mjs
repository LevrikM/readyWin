#!/usr/bin/env node
// Signs shared/catalog.json with the ReadyWin catalog key and publishes the
// signed copy to site/catalog.json + site/catalog.sig.
//
// The private key defaults to .keys/catalog-signing-key.pem and must never be
// committed. Override with CATALOG_SIGNING_KEY=/path/to/key.pem.
import {createPrivateKey, createPublicKey, sign, verify} from 'node:crypto'
import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'shared', 'catalog.json')
const keyPath = process.env.CATALOG_SIGNING_KEY
  ? resolve(process.env.CATALOG_SIGNING_KEY)
  : join(root, '.keys', 'catalog-signing-key.pem')

if (!existsSync(keyPath)) {
  console.error(`Signing key not found: ${keyPath}`)
  console.error('Generate one with: node scripts/generate-catalog-key.mjs')
  process.exit(1)
}

const payload = readFileSync(source)
const privateKey = createPrivateKey(readFileSync(keyPath))
const publicKey = createPublicKey(privateKey)
const signature = sign(null, payload, privateKey)

if (!verify(null, payload, publicKey, signature)) {
  console.error('Signature self-check failed.')
  process.exit(1)
}

const jwk = publicKey.export({format: 'jwk'})
writeFileSync(join(root, 'site', 'catalog.json'), payload)
writeFileSync(join(root, 'site', 'catalog.sig'), signature.toString('base64') + '\n')

console.log(`Signed ${source}`)
console.log(`  catalog: ${payload.length} bytes -> site/catalog.json`)
console.log(`  signature: ${signature.length} bytes -> site/catalog.sig`)
console.log(`  public key (base64url): ${jwk.x}`)
