#!/usr/bin/env node
/**
 * Seed the initial "top 10" lists into the `achievementLists` collection shown
 * on the Achievements page. Idempotent: a list is only created if no list with
 * the same name already exists, so it's safe to re-run. Entries themselves are
 * left empty — admins fill each list in on the page.
 *
 * Usage:
 *   node scripts/seed-achievement-lists.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// In intended display order.
const LIST_NAMES = [
  'Dabartinis Lietuvos Sunkiausių Demonų TOP 10',
  'Dabartinis Lietuvos Sunkiausių Challengų TOP 10',
  'Dabartinis Lietuvos Žaidėjų TOP 10 pagal sunkiausius įveiktus demonus',
]

async function main() {
  const admin = (await import('firebase-admin')).default
  const keyPath = resolve(__dirname, 'serviceAccountKey.json')
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  const db = admin.firestore()

  const snap = await db.collection('achievementLists').get()
  const existingNames = new Set(snap.docs.map((d) => (d.data().name || '').trim()))
  let maxOrder = -1
  for (const d of snap.docs) {
    const o = d.data().order
    if (typeof o === 'number' && o > maxOrder) maxOrder = o
  }

  let added = 0
  for (const name of LIST_NAMES) {
    if (existingNames.has(name)) {
      console.log(`• skip (exists): ${name}`)
      continue
    }
    maxOrder += 1
    await db.collection('achievementLists').add({
      name,
      order: maxOrder,
      createdAt: Date.now(),
    })
    added += 1
    console.log(`✓ created (order ${maxOrder}): ${name}`)
  }

  console.log(`\nDone — ${added} list(s) created, ${LIST_NAMES.length - added} already present.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
