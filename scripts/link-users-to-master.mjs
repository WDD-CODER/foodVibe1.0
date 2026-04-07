/**
 * Link existing user products to their corresponding master products.
 *
 * After migrate-to-master.mjs promotes orphaned products to userId: '__master__',
 * existing users have no _masterId on their products. On next login, syncMasterToUser
 * would clone ALL 894 master products as new items — creating duplicates.
 *
 * This script name-matches each user product to a master product and sets:
 *   _masterId: <master product _id>
 *   _userModified: true   ← sync will skip these (preserving custom prices etc.)
 *
 * Flags:
 *   --write              Apply changes (default: dry-run)
 *   --userId=<id>        Process only this user (default: all users)
 *
 * Run: node scripts/link-users-to-master.mjs [--write] [--userId=baf47]
 */
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const require = createRequire(resolve(ROOT, 'server', 'package.json'))
const { MongoClient } = require('mongodb')
const { config } = require('dotenv')

config({ path: resolve(ROOT, '.env') })

const uri = process.env.MONGO_REMOTE_URI || process.env.MONGO_URI
if (!uri) { console.error('ERROR: MONGO_REMOTE_URI not set in .env'); process.exit(1) }

const WRITE = process.argv.includes('--write')
const userIdArg = process.argv.find(a => a.startsWith('--userId='))?.split('=')[1] ?? null

console.log(WRITE ? '[link] WRITE mode\n' : '[link] DRY-RUN mode (pass --write to apply)\n')
if (userIdArg) console.log(`[link] Targeting userId: ${userIdArg}\n`)

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

// ── Load master products ──────────────────────────────────────────────────────
const masterProducts = await db.collection('PRODUCT_LIST').find({ userId: '__master__' }).toArray()
if (masterProducts.length === 0) {
  console.log('No master products found. Run migrate-to-master.mjs --write first.')
  await client.close()
  process.exit(0)
}

// Map: name_hebrew → master _id
const masterByName = new Map(masterProducts.map(p => [p.name_hebrew, String(p._id)]))
console.log(`Master products loaded: ${masterProducts.length}`)
console.log()

// ── Find users to process ─────────────────────────────────────────────────────
let userIds
if (userIdArg) {
  userIds = [userIdArg]
} else {
  // Get all distinct userIds from PRODUCT_LIST (excluding __master__)
  const distinct = await db.collection('PRODUCT_LIST').distinct('userId', {
    userId: { $exists: true, $ne: null, $ne: '__master__' }
  })
  userIds = distinct.filter(Boolean)
}

console.log(`Users to process: ${userIds.join(', ') || '(none)'}`)
console.log()

let totalMatched = 0
let totalUnmatched = 0
let totalAlreadyLinked = 0

for (const userId of userIds) {
  // Only look at products that don't yet have a master link
  const userProducts = await db.collection('PRODUCT_LIST').find({
    userId,
    $or: [{ _masterId: { $exists: false } }, { _masterId: null }]
  }).toArray()

  console.log(`── userId: ${userId} (${userProducts.length} unlinked products) ──────`)

  let matched = 0
  let unmatched = 0

  for (const product of userProducts) {
    const masterId = masterByName.get(product.name_hebrew)
    if (masterId) {
      matched++
      totalMatched++
      console.log(`  LINK  "${product.name_hebrew}" → master:${masterId}`)
      if (WRITE) {
        await db.collection('PRODUCT_LIST').updateOne(
          { _id: product._id },
          { $set: { _masterId: masterId, _userModified: true } }
        )
      }
    } else {
      unmatched++
      totalUnmatched++
      console.log(`  SKIP  "${product.name_hebrew}" — no master match`)
    }
  }

  // Count already-linked products (for info)
  const alreadyLinked = await db.collection('PRODUCT_LIST').countDocuments({
    userId,
    _masterId: { $exists: true, $ne: null }
  })
  totalAlreadyLinked += alreadyLinked

  console.log(`  → matched: ${matched}, unmatched: ${unmatched}, already-linked: ${alreadyLinked}`)
  console.log()
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('── Summary ──────────────────────────────────────────────────')
console.log(`  Products linked    : ${totalMatched}`)
console.log(`  No master match    : ${totalUnmatched} (user-created products, not in master catalog)`)
console.log(`  Already linked     : ${totalAlreadyLinked}`)
console.log(`  Mode               : ${WRITE ? 'WRITE (applied)' : 'DRY-RUN (no changes)'}`)

await client.close()
