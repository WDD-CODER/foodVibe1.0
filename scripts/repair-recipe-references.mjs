/**
 * STATUS (2026-04-07): Repair status unknown — kept until confirmed complete in production.
 * Part of the broken-ref repair trio (backup → diagnose → repair).
 * Run: node scripts/repair-recipe-references.mjs  OR  npm run repair:refs
 * If the repair has been fully applied in production, delete this file along with
 * backup-before-repair.mjs and diagnose-broken-refs.mjs.
 *
 * Repair broken demo_XXX referenceIds in RECIPE_LIST and DISH_LIST.
 *
 * Strategy (Path B — name match):
 *  1. Load orphaned demo products (no userId) → build demo_id → name map
 *  2. Load each user's own products → build name → user_product_id map
 *  3. For each recipe/dish ingredient with a broken ref:
 *     - If name match found → rewrite referenceId to user's product _id
 *     - If no match → set referenceId to null, mark unlinked: true
 *  4. Optionally backfill nameSnapshot for all successfully resolved ingredients
 *
 * Flags:
 *   --write              Actually write to MongoDB (default: dry-run only)
 *   --backfill-snapshot  Also write nameSnapshot field to every resolved ingredient
 *
 * Run: node scripts/repair-recipe-references.mjs [--write] [--backfill-snapshot]
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
if (!uri) {
  console.error('ERROR: MONGO_REMOTE_URI not set in .env')
  process.exit(1)
}

const WRITE = process.argv.includes('--write')
const BACKFILL = process.argv.includes('--backfill-snapshot')

if (!WRITE) {
  console.log('[repair] DRY-RUN mode — no writes will occur. Pass --write to apply.\n')
} else {
  console.log('[repair] WRITE mode — changes WILL be persisted to MongoDB.\n')
}

const client = new MongoClient(uri)

async function run() {
  await client.connect()
  const db = client.db()

  // 1. Load orphaned demo products (no userId field)
  const orphanDocs = await db.collection('PRODUCT_LIST').find({ userId: { $exists: false } }).toArray()
  const demoIdToName = new Map(orphanDocs.map(p => [p._id, p.name_hebrew]))
  console.log(`[repair] Found ${orphanDocs.length} orphaned demo products (no userId)`)

  // 2. Load user-owned products grouped by userId
  const ownedProducts = await db.collection('PRODUCT_LIST').find({ userId: { $exists: true } }).toArray()
  const userProductMaps = new Map() // userId → Map<name_hebrew, _id>
  for (const p of ownedProducts) {
    if (!userProductMaps.has(p.userId)) userProductMaps.set(p.userId, new Map())
    userProductMaps.get(p.userId).set(p.name_hebrew, p._id)
  }
  console.log(`[repair] Found ${ownedProducts.length} user-owned products across ${userProductMaps.size} user(s)\n`)

  let totalFixed = 0
  let totalUnlinked = 0
  let totalSkipped = 0

  for (const colName of ['RECIPE_LIST', 'DISH_LIST']) {
    const docs = await db.collection(colName).find({}).toArray()
    console.log(`── ${colName} (${docs.length} docs) ──────────────────────`)

    for (const doc of docs) {
      const userMap = userProductMaps.get(doc.userId)
      if (!userMap) {
        console.log(`  SKIP "${doc.name_hebrew}" — no products for userId ${doc.userId}`)
        continue
      }

      // Build the set of valid refs for this user
      const userProductIds = new Set(userMap.values())
      const userRecipeIds = new Set(
        (await db.collection('RECIPE_LIST').find({ userId: doc.userId }, { projection: { _id: 1 } }).toArray()).map(r => r._id)
      )
      const userDishIds = new Set(
        (await db.collection('DISH_LIST').find({ userId: doc.userId }, { projection: { _id: 1 } }).toArray()).map(d => d._id)
      )
      const validRefs = new Set([...userProductIds, ...userRecipeIds, ...userDishIds])

      const ingredients = doc.ingredients_ || []
      let docChanged = false
      const updatedIngredients = ingredients.map(ing => {
        if (!ing.referenceId || validRefs.has(ing.referenceId)) {
          // Already valid — optionally backfill nameSnapshot
          if (BACKFILL && ing.referenceId && validRefs.has(ing.referenceId) && !ing.nameSnapshot) {
            const liveProduct = ownedProducts.find(p => p._id === ing.referenceId && p.userId === doc.userId)
            if (liveProduct?.name_hebrew) {
              totalFixed++
              docChanged = true
              console.log(`  BACKFILL nameSnapshot "${liveProduct.name_hebrew}" on ${ing.referenceId} in "${doc.name_hebrew}"`)
              return { ...ing, nameSnapshot: liveProduct.name_hebrew }
            }
          }
          return ing
        }

        // Broken ref — try to fix by name
        const demoName = demoIdToName.get(ing.referenceId)
        const newId = demoName ? userMap.get(demoName) : undefined

        if (newId) {
          totalFixed++
          docChanged = true
          const updated = { ...ing, referenceId: newId }
          if (BACKFILL) updated.nameSnapshot = demoName
          console.log(`  FIX   "${doc.name_hebrew}" | ${ing.referenceId} → ${newId} ("${demoName}")`)
          return updated
        } else {
          totalUnlinked++
          docChanged = true
          console.log(`  UNLINK "${doc.name_hebrew}" | ${ing.referenceId} (demo name: "${demoName ?? 'unknown'}") — no match`)
          return { ...ing, referenceId: null, unlinked: true }
        }
      })

      if (docChanged && WRITE) {
        await db.collection(colName).updateOne(
          { _id: doc._id },
          { $set: { ingredients_: updatedIngredients } }
        )
      }
    }
  }

  console.log(`\n── Summary ───────────────────────────────────`)
  console.log(`  Fixed (referenceId rewritten)  : ${totalFixed}`)
  console.log(`  Unlinked (no name match)       : ${totalUnlinked}`)
  console.log(`  Mode                           : ${WRITE ? 'WRITE (applied to MongoDB)' : 'DRY-RUN (no changes made)'}`)
  if (BACKFILL) console.log(`  nameSnapshot backfill          : enabled`)

  await client.close()
}

run().catch(err => {
  console.error('[repair] FATAL:', err.message)
  process.exit(1)
})
