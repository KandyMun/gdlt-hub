#!/usr/bin/env node
/**
 * Add a single manual entry to the live LTCL `changelog` collection.
 * One-off: edit ENTRY below and run `node scripts/add-changelog-entry.mjs`.
 *
 * `level` is the bolded lead level name, `text` the rest of the line.
 * `ts` uses now() so the entry sorts to the top (display is newest-first).
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ENTRY = {
  level: 'Undisclosed v2',
  text: 'dingo be žinios',
  date: '2026-07-15',
}

async function main() {
  const admin = (await import('firebase-admin')).default
  const keyPath = resolve(__dirname, 'serviceAccountKey.json')
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  const db = admin.firestore()

  const data = { level: ENTRY.level, text: ENTRY.text, date: ENTRY.date, ts: Date.now() }
  const ref = await db.collection('changelog').add(data)
  console.log('Added changelog entry', ref.id, JSON.stringify(data))
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
