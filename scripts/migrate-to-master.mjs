/**
 * Promote orphaned documents (no userId) to userId: '__master__'.
 *
 * The scraper inserted products, recipes, and dishes without stamping a userId.
 * This script finds all such orphaned docs and promotes them to the master layer
 * so new users will receive them on signup via cloneMasterDataToUser().
 *
 * For orphaned recipes/dishes, ingredient referenceIds that point to other
 * orphaned products are remapped to the correct master product _id by name_hebrew.
 *
 * Flags:
 *   --write   Apply changes (default: dry-run)
 *
 * Run: node scripts/migrate-to-master.mjs [--write]
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
console.log(WRITE ? '[migrate] WRITE mode\n' : '[migrate] DRY-RUN mode (pass --write to apply)\n')

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

// ── Find orphaned docs (no userId field at all, or userId is null/undefined) ──
const orphanFilter = { $or: [{ userId: { $exists: false } }, { userId: null }] }

const orphanedProducts = await db.collection('PRODUCT_LIST').find(orphanFilter).toArray()
const orphanedRecipes  = await db.collection('RECIPE_LIST').find(orphanFilter).toArray()
const orphanedDishes   = await db.collection('DISH_LIST').find(orphanFilter).toArray()

console.log(`Found orphaned docs:`)
console.log(`  PRODUCT_LIST : ${orphanedProducts.length}`)
console.log(`  RECIPE_LIST  : ${orphanedRecipes.length}`)
console.log(`  DISH_LIST    : ${orphanedDishes.length}`)
console.log()

if (orphanedProducts.length === 0 && orphanedRecipes.length === 0 && orphanedDishes.length === 0) {
  console.log('Nothing to migrate.')
  await client.close()
  process.exit(0)
}

// ── Step 1: Stamp orphaned products → __master__ ──────────────────────────────
// Build a name → _id map FROM the orphaned products so we can remap recipe refs
const orphanIdByName = new Map(orphanedProducts.map(p => [p.name_hebrew, String(p._id)]))

let productsPromoted = 0
if (orphanedProducts.length > 0) {
  console.log('── Promoting PRODUCT_LIST ───────────────────────────────')
  if (WRITE) {
    const result = await db.collection('PRODUCT_LIST').updateMany(
      orphanFilter,
      { $set: { userId: '__master__', _masterId: null, _userModified: false } }
    )
    productsPromoted = result.modifiedCount
  } else {
    productsPromoted = orphanedProducts.length
  }
  console.log(`  ${WRITE ? 'Updated' : 'Would update'} ${productsPromoted} products → userId: '__master__'`)
  console.log()
}

// ── Step 2: Remap ingredient refs + stamp orphaned recipes/dishes ─────────────
// We also need to know the _id values of the orphaned products AFTER promotion
// (they keep their _id; we just stamped userId on them).
// Build a second map: old demo_XXX ids + actual orphan _ids → orphan _id
// so we can remap any ingredient that was pointing at an orphaned product.
const orphanIdById = new Map(orphanedProducts.map(p => [String(p._id), String(p._id)]))

// Also map demo_XXX style references by name:
// Some scrapers inserted referenceId as 'demo_<name>' or similar – we resolve by name_hebrew
const orphanIdByDemo = new Map(
  orphanedProducts.map(p => [`demo_${p.name_hebrew}`, String(p._id)])
)

function remapRef(referenceId) {
  if (!referenceId) return { id: referenceId, changed: false }
  const ref = String(referenceId)
  // Already an actual orphaned product _id
  if (orphanIdById.has(ref)) return { id: ref, changed: false }
  // demo_ style key
  if (orphanIdByDemo.has(ref)) return { id: orphanIdByDemo.get(ref), changed: true }
  return { id: ref, changed: false }
}

let recipesPromoted = 0
let refsRemapped = 0
let refsUnresolvable = 0

for (const [colName, docs] of [['RECIPE_LIST', orphanedRecipes], ['DISH_LIST', orphanedDishes]]) {
  if (docs.length === 0) continue
  console.log(`── Promoting ${colName} (${docs.length} docs) ────────────────────`)

  for (const doc of docs) {
    const ings = doc.ingredients_ || []
    let docChanged = false

    const updated = ings.map(ing => {
      if (!ing.referenceId) return ing
      const { id: newRef, changed } = remapRef(ing.referenceId)
      if (changed) {
        refsRemapped++
        docChanged = true
        console.log(`  REMAP "${doc.name_hebrew}" | ${ing.referenceId} → ${newRef}`)
        return { ...ing, referenceId: newRef }
      }
      // Check if this ref points nowhere (not an orphaned product, not a known ref)
      if (!orphanIdById.has(String(ing.referenceId))) {
        // Could be pointing to a user-owned product or a recipe – leave untouched
        // Only flag as unresolvable if it looks like a broken demo ref
        const ref = String(ing.referenceId)
        if (ref.startsWith('demo_')) {
          refsUnresolvable++
          console.log(`  UNRESOLVABLE "${doc.name_hebrew}" | ref: ${ref}`)
        }
      }
      return ing
    })

    if (WRITE) {
      const updateOp = { $set: { userId: '__master__', _masterId: null, _userModified: false } }
      if (docChanged) updateOp.$set.ingredients_ = updated
      await db.collection(colName).updateOne({ _id: doc._id }, updateOp)
    }
    recipesPromoted++
  }
  console.log()
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('── Summary ──────────────────────────────────────────────────')
console.log(`  Products promoted  : ${productsPromoted}`)
console.log(`  Recipes promoted   : ${recipesPromoted}`)
console.log(`  Refs remapped      : ${refsRemapped}`)
console.log(`  Unresolvable refs  : ${refsUnresolvable}`)
console.log(`  Mode               : ${WRITE ? 'WRITE (applied)' : 'DRY-RUN (no changes)'}`)

await client.close()
