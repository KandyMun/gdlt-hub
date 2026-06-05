#!/usr/bin/env node
/**
 * Freepost admin CLI — requires a Firebase service account key.
 *
 * Setup:
 *   1. Firebase Console → Project Settings → Service accounts → Generate new private key
 *   2. Save the downloaded JSON as scripts/serviceAccountKey.json  (git-ignored)
 *   3. node scripts/admin.js <command> [args]
 *
 * Commands:
 *   pin   <postId>           — pin a post
 *   unpin <postId>           — unpin a post
 *   list-posts               — list all posts (id, title, pinned)
 *   list-users               — list all users (id, username, banned)
 *   ban   <uid>              — ban a user
 *   unban <uid>              — unban a user
 *   delete-post <postId>     — delete a post document (does not remove storage file)
 */

import admin from 'firebase-admin'
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keyPath = resolve(__dirname, 'serviceAccountKey.json')

let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
} catch {
  console.error('❌  serviceAccountKey.json not found.')
  console.error('   Download it from Firebase Console → Project Settings → Service accounts')
  console.error(`   and save it to: ${keyPath}`)
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const [,, command, arg] = process.argv

async function run() {
  switch (command) {
    case 'pin':
    case 'unpin': {
      if (!arg) return console.error('Usage: node scripts/admin.js pin|unpin <postId>')
      const pinned = command === 'pin'
      await db.collection('posts').doc(arg).update({ pinned })
      console.log(`✅  Post ${arg} ${pinned ? 'pinned' : 'unpinned'}.`)
      break
    }

    case 'list-posts': {
      const snap = await db.collection('posts').orderBy('createdAt', 'desc').get()
      if (snap.empty) { console.log('No posts.'); break }
      for (const d of snap.docs) {
        const { title, pinned, authorEmail } = d.data()
        const author = (authorEmail ?? '').replace('@freepost.local', '')
        console.log(`${d.id}  [${pinned ? '📌 pinned' : '      '}]  ${title}  (${author})`)
      }
      break
    }

    case 'list-users': {
      const snap = await db.collection('users').get()
      if (snap.empty) { console.log('No users.'); break }
      for (const d of snap.docs) {
        const { username, banned, createdAt } = d.data()
        const date = new Date(createdAt).toISOString().slice(0, 10)
        console.log(`${d.id}  ${banned ? '🚫 banned  ' : '          '}  ${username}  (joined ${date})`)
      }
      break
    }

    case 'ban':
    case 'unban': {
      if (!arg) return console.error('Usage: node scripts/admin.js ban|unban <uid>')
      const banned = command === 'ban'
      await db.collection('users').doc(arg).update({ banned })
      console.log(`✅  User ${arg} ${banned ? 'banned' : 'unbanned'}.`)
      break
    }

    case 'delete-post': {
      if (!arg) return console.error('Usage: node scripts/admin.js delete-post <postId>')
      await db.collection('posts').doc(arg).delete()
      console.log(`✅  Post ${arg} deleted. (Storage file not removed — do that manually in Firebase Console if needed.)`)
      break
    }

    case 'migrate-pinned': {
      const snap = await db.collection('posts').get()
      let count = 0
      for (const d of snap.docs) {
        if (d.data().pinned === undefined) {
          await d.ref.update({ pinned: false })
          count++
        }
      }
      console.log(`✅  Set pinned: false on ${count} post(s). ${snap.size - count} already had the field.`)
      break
    }

    default:
      console.log(`
Freepost admin CLI

Commands:
  pin   <postId>        pin a post
  unpin <postId>        unpin a post
  list-posts            list all posts
  list-users            list all users
  ban   <uid>           ban a user
  unban <uid>           unban a user
  delete-post <postId>  delete a post document
  migrate-pinned        add pinned: false to all posts that are missing the field
      `.trim())
  }

  process.exit(0)
}

run().catch((err) => { console.error('❌ ', err.message); process.exit(1) })
