/**
 * Backfill stale nameSnapshot values in RECIPE_LIST and DISH_LIST.
 *
 * A nameSnapshot is stale when the live product/recipe has been renamed
 * since the recipe was last saved through the app's form builder.
 * getDisplayName() already prefers the live name, but stale snapshots cause
 * fallback display issues and confuse the unlinked-ingredient detection.
 *
 * Strategy:
 *  1. For each ingredient with a valid referenceId, look up the live item name.
 *  2. If nameSnapshot differs → update it to the current live name.
 *  3. If nameSnapshot is missing → add it.
 *  4. Items whose referenceId doesn't resolve are logged but left untouched.
 *
 * Flags:
 *   --write   Apply changes to MongoDB (default: dry-run)
 *
 * Run: node scripts/backfill-name-snapshots.mjs [--write]
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
console.log(WRITE ? '[backfill] WRITE mode\n' : '[backfill] DRY-RUN mode (pass --write to apply)\n')

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

// Load all products, recipes, dishes
const allProducts = await db.collection('PRODUCT_LIST').find({}).toArray()
const allRecipes = await db.collection('RECIPE_LIST').find({}).toArray()
const allDishes = await db.collection('DISH_LIST').find({}).toArray()

const productMap = new Map(allProducts.map(p => [String(p._id), p.name_hebrew]))
const recipeMap = new Map([...allRecipes, ...allDishes].map(r => [String(r._id), r.name_hebrew]))

let totalUpdated = 0
let totalMissing = 0
let totalUnresolvable = 0

for (const colName of ['RECIPE_LIST', 'DISH_LIST']) {
  const docs = colName === 'RECIPE_LIST' ? allRecipes : allDishes
  console.log(`── ${colName} (${docs.length} docs) ──────────────────────`)

  for (const doc of docs) {
    const ings = doc.ingredients_ || []
    let docChanged = false
    const updated = ings.map(ing => {
      if (!ing.referenceId) return ing

      const liveName = productMap.get(String(ing.referenceId)) ?? recipeMap.get(String(ing.referenceId))

      if (!liveName) {
        totalUnresolvable++
        return ing
      }

      if (!ing.nameSnapshot) {
        totalMissing++
        docChanged = true
        console.log(`  ADD    "${doc.name_hebrew}" | ${ing.referenceId} → "${liveName}"`)
        return { ...ing, nameSnapshot: liveName }
      }

      if (ing.nameSnapshot !== liveName) {
        totalUpdated++
        docChanged = true
        console.log(`  UPDATE "${doc.name_hebrew}" | ${ing.referenceId} | "${ing.nameSnapshot}" → "${liveName}"`)
        return { ...ing, nameSnapshot: liveName }
      }

      return ing
    })

    if (docChanged && WRITE) {
      await db.collection(colName).updateOne(
        { _id: doc._id },
        { $set: { ingredients_: updated } }
      )
    }
  }
}

console.log(`\n── Summary ───────────────────────────────────`)
console.log(`  Stale snapshots updated : ${totalUpdated}`)
console.log(`  Missing snapshots added : ${totalMissing}`)
console.log(`  Unresolvable refs       : ${totalUnresolvable}`)
console.log(`  Mode                    : ${WRITE ? 'WRITE (applied)' : 'DRY-RUN (no changes)'}`)

await client.close()
