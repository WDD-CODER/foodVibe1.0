/**
 * Fix duplicate names across RECIPE_LIST and DISH_LIST.
 *
 * Dishes and preparations share a global name namespace — having the same
 * name_hebrew in both collections is a data error from incorrect seeding.
 * This script finds all conflicts and removes the DISH_LIST copy, keeping
 * the RECIPE_LIST (preparation) version as authoritative.
 *
 * Flags:
 *   --write              Apply deletions (default: dry-run, just reports)
 *   --local              Use MONGO_LOCAL_URI instead of MONGO_URI (default: local)
 *   --remote             Use MONGO_URI (Atlas)
 *
 * Run: node scripts/fix-duplicate-names.mjs [--write] [--remote]
 */
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const require = createRequire(resolve(ROOT, 'server', 'package.json'))
const { MongoClient } = require('mongodb')
const { config } = require('dotenv')

config({ path: resolve(ROOT, 'server', '.env') })
// Also try root .env
config({ path: resolve(ROOT, '.env') })

const WRITE = process.argv.includes('--write')
const REMOTE = process.argv.includes('--remote')

const uri = REMOTE
  ? (process.env.MONGO_URI || process.env.MONGO_REMOTE_URI)
  : (process.env.MONGO_LOCAL_URI || process.env.MONGO_URI)

if (!uri) {
  console.error('ERROR: No MongoDB URI found in .env (MONGO_LOCAL_URI or MONGO_URI)')
  process.exit(1)
}

console.log(WRITE ? '[fix-names] WRITE mode\n' : '[fix-names] DRY-RUN mode (pass --write to apply)\n')
console.log(`[fix-names] Connecting to: ${uri.replace(/:\/\/[^@]+@/, '://<credentials>@')}\n`)

const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db()

  const recipes = await db.collection('RECIPE_LIST').find({}).toArray()
  const dishes  = await db.collection('DISH_LIST').find({}).toArray()

  // Index recipe names by (name_hebrew, userId) — lowercase trimmed for comparison
  const recipeIndex = new Map()
  for (const r of recipes) {
    const key = `${(r.name_hebrew ?? '').trim().toLowerCase()}|${r.userId ?? ''}`
    if (!recipeIndex.has(key)) recipeIndex.set(key, [])
    recipeIndex.get(key).push(r)
  }

  // Find dishes whose name+userId combo also exists in RECIPE_LIST
  const conflicts = []
  for (const d of dishes) {
    const key = `${(d.name_hebrew ?? '').trim().toLowerCase()}|${d.userId ?? ''}`
    if (recipeIndex.has(key)) {
      conflicts.push({ dish: d, recipes: recipeIndex.get(key) })
    }
  }

  if (conflicts.length === 0) {
    console.log('No conflicts found. Collections are clean.')
    return
  }

  console.log(`Found ${conflicts.length} conflict(s):\n`)
  for (const { dish, recipes: matching } of conflicts) {
    console.log(`  CONFLICT: "${dish.name_hebrew}"  (userId: ${dish.userId ?? 'none'})`)
    console.log(`    DISH    _id=${dish._id}  (will be removed)`)
    for (const r of matching) {
      console.log(`    RECIPE  _id=${r._id}  (kept)`)
    }
  }

  if (!WRITE) {
    console.log(`\n[dry-run] Would remove ${conflicts.length} dish record(s). Pass --write to apply.`)
    return
  }

  const dishIds = conflicts.map(c => c.dish._id)
  const result = await db.collection('DISH_LIST').deleteMany({ _id: { $in: dishIds } })
  console.log(`\n[write] Deleted ${result.deletedCount} dish record(s) from DISH_LIST.`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => client.close())
