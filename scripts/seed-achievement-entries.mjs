#!/usr/bin/env node
/**
 * Seed the entries of the three initial "top 10" lists (see
 * seed-achievement-lists.mjs) into the `achievements` collection.
 *
 * Each entry credits one or more people, each with their own attempt count.
 * A person is linked to their hub account when a user with that username exists;
 * otherwise the raw name is kept as fallback text.
 *
 * Idempotent per list: a list that already has entries is skipped unless you
 * pass --force (which deletes that list's entries first, then reseeds).
 *
 * Usage:
 *   node scripts/seed-achievement-entries.mjs --dry     # show plan, no writes
 *   node scripts/seed-achievement-entries.mjs           # seed empty lists
 *   node scripts/seed-achievement-entries.mjs --force   # clear + reseed all
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const force = args.includes('--force')

// p(handle, attempts) — one credited person: raw @handle (without @) + attempts
// count (number only; the UI appends "attempts" automatically).
const p = (handle, attempts) => ({ handle, attempts })

const LISTS = [
  {
    name: 'Dabartinis Lietuvos Sunkiausių Demonų TOP 10',
    entries: [
      { title: 'Slaughterhouse', people: [p('jolas', '255 021'), p('RiVeLqZOV', '109 064')] },
      { title: 'Sakupen Circles', people: [p('jolas', '135 363')] },
      { title: 'Firework', people: [p('galingasis', '95 000')] },
      { title: 'Solar Flare', people: [p('jolas', '40 360')] },
      { title: 'LIMBO', people: [p('galingasis', '28 000')] },
      { title: 'Gaggatrondra', people: [p("Bait'as Rage'as", '41 921')] },
      { title: 'Collapse', people: [p('spa', '74 228')] },
      { title: 'The Plunge', people: [p('Senis Besmegenis', '47 320')] },
      { title: 'Midnight', people: [p('explosivostar', '33 541')] },
      { title: 'Sinister Silence', people: [p('wkėjos direktorius', '18 211')] },
    ],
  },
  {
    name: 'Dabartinis Lietuvos Sunkiausių Challengų TOP 10',
    entries: [
      { title: 'Chromium', people: [p('harmas', '203 072')] },
      { title: 'Murder Mitten', people: [p('jolas', '31 441')] },
      { title: 'Viridescent', people: [p('jolas', '100 000+')] },
      { title: 'Flutterwonder', people: [p('jolas', '21 344')] },
      { title: 'Apotheosis', people: [p('jolas', '21 265')] },
      { title: 'cooks', people: [p('jolas', '15 644')] },
      { title: 'Exquisite Difficulty', people: [p('jolas', '15 938')] },
      { title: 'Toxic Blades', people: [p('jolas', '~80 000')] },
      { title: 'Rat Poison', people: [p('jolas', '7 687')] },
      { title: 'Gloom', people: [p('jolas', '21 135'), p('tapke', '20 606')] },
    ],
  },
  {
    name: 'Dabartinis Lietuvos Žaidėjų TOP 10 pagal sunkiausius įveiktus demonus',
    entries: [
      { title: 'Slaughterhouse', people: [p('jolas', '255 021'), p('RiVeLqZOV', '109 064')] },
      { title: 'Firework', people: [p('galingasis', '~95 000')] },
      { title: 'Gaggatrondra', people: [p("Bait'as Rage'as", '41 921')] },
      { title: 'Collapse', people: [p('spa', '74 288')] },
      { title: 'The Plunge', people: [p('Senis Besmegenis', '47 320')] },
      { title: 'Midnight', people: [p('explosivostar', '33 500')] },
      { title: 'Sinister Silence', people: [p('wkėjos direktorius', '19 512')] },
      { title: 'UNKNOWN', people: [p('sheshespurgis', '91 512')] },
      { title: 'Trueffet', people: [p('kendihmenas', '79 134')] },
      { title: 'in this', people: [p('algirdas', '12 790')] },
    ],
  },
]

async function main() {
  const admin = (await import('firebase-admin')).default
  const keyPath = resolve(__dirname, 'serviceAccountKey.json')
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  const db = admin.firestore()

  // Resolve a raw @handle to a linked account when possible, else fallback text.
  const cache = new Map()
  async function resolvePerson(raw) {
    const handle = raw.trim().replace(/^@/, '')
    const key = handle.toLowerCase()
    if (cache.has(key)) return cache.get(key)
    const snap = await db.collection('users').where('username', '==', key).limit(1).get()
    const person = snap.empty ? { handle: null, text: handle } : { handle: snap.docs[0].data().username, text: null }
    cache.set(key, person)
    return person
  }

  const listSnap = await db.collection('achievementLists').get()
  const idByName = new Map(listSnap.docs.map((d) => [(d.data().name || '').trim(), d.id]))

  for (const list of LISTS) {
    const listId = idByName.get(list.name)
    if (!listId) {
      console.error(`⚠️  list not found, skipping: ${list.name}`)
      continue
    }

    const existing = await db.collection('achievements').where('listId', '==', listId).get()
    if (!existing.empty && !force) {
      console.log(`• skip (has ${existing.size} entries): ${list.name}`)
      continue
    }

    console.log(`\n${list.name}`)
    const writes = []
    for (let i = 0; i < list.entries.length; i++) {
      const e = list.entries[i]
      const people = []
      for (const pp of e.people) {
        const person = await resolvePerson(pp.handle)
        people.push({ person, attempts: pp.attempts })
      }
      const who = people.map((x) => `${x.person.handle ? '@' + x.person.handle : x.person.text} (${x.attempts})`).join(', ')
      console.log(`  ${i + 1}. ${e.title} — ${who}`)
      writes.push({ listId, order: i, title: e.title, link: e.link ?? '', people, createdAt: Date.now() })
    }

    if (dry) continue

    const batch = db.batch()
    for (const d of existing.docs) batch.delete(d.ref)
    for (const w of writes) batch.set(db.collection('achievements').doc(), w)
    await batch.commit()
    console.log(`  ✅  wrote ${writes.length} entries`)
  }

  console.log(dry ? '\nDry run — no writes.' : '\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
