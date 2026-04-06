/**
 * Diagnose broken referenceId links in recipes and dishes.
 * Run: node scripts/diagnose-broken-refs.mjs
 * Requires MONGO_URI in environment (or .env file).
 */
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(resolve(__dirname, '..', 'server', 'package.json'))
const { MongoClient } = require('mongodb')
const { config } = require('dotenv')

config({ path: resolve(__dirname, '..', '.env') })

const uri = process.env.MONGO_REMOTE_URI || process.env.MONGO_URI
if (!uri) {
  console.error('ERROR: MONGO_REMOTE_URI (or MONGO_URI) is not set in .env')
  process.exit(1)
}

const client = new MongoClient(uri)

async function run() {
  await client.connect()
  const db = client.db()

  // 1. All products — grouped by userId
  const allProducts = await db.collection('PRODUCT_LIST').find({}, { projection: { _id: 1, name_hebrew: 1, userId: 1 } }).toArray()
  const demoProducts = allProducts.filter(p => !p.userId)
  const demoIdSet = new Set(demoProducts.map(p => p._id))
  const demoNameToId = new Map(demoProducts.map(p => [p.name_hebrew, p._id]))

  // Group user-owned products by userId
  const byUser = {}
  for (const p of allProducts.filter(p => p.userId)) {
    byUser[p.userId] = byUser[p.userId] ?? []
    byUser[p.userId].push(p)
  }

  console.log(`\n── Collection sizes ──────────────────────────`)
  console.log(`  PRODUCT_LIST : ${allProducts.length} docs total`)
  console.log(`    no userId (orphaned demo): ${demoProducts.length}`)
  console.log(`    userId __master__ : ${allProducts.filter(p => p.userId === '__master__').length}`)
  console.log(`    other users : ${Object.keys(byUser).filter(u => u !== '__master__').length} users`)
  Object.entries(byUser).filter(([u]) => u !== '__master__').forEach(([uid, prods]) => {
    console.log(`      userId ${uid}: ${prods.length} products`)
  })

  // 2. Recipes and dishes
  const allRecipes = await db.collection('RECIPE_LIST').find({}).toArray()
  const allDishes = await db.collection('DISH_LIST').find({}).toArray()
  console.log(`  RECIPE_LIST  : ${allRecipes.length} docs`)
  console.log(`  DISH_LIST    : ${allDishes.length} docs`)

  // 3. For each recipe/dish owner, check which refs are invisible to that user
  const recipeUsers = [...new Set(allRecipes.map(r => r.userId).filter(Boolean))]
  const dishUsers   = [...new Set(allDishes.map(d => d.userId).filter(Boolean))]
  const allUsers    = [...new Set([...recipeUsers, ...dishUsers])]

  let totalBrokenRows = 0
  let totalFixableRows = 0
  let totalUnlinkableRows = 0
  const brokenByPattern = {}

  for (const userId of allUsers) {
    // What this user can see
    const userProductIds = new Set((byUser[userId] ?? []).map(p => p._id))
    const userRecipeIds = new Set(allRecipes.filter(r => r.userId === userId).map(r => r._id))
    const userDishIds = new Set(allDishes.filter(d => d.userId === userId).map(d => d._id))
    const userNameToId = new Map((byUser[userId] ?? []).map(p => [p.name_hebrew, p._id]))
    const validRefs = new Set([...userProductIds, ...userRecipeIds, ...userDishIds])

    const userRecipes = allRecipes.filter(r => r.userId === userId)
    const userDishes  = allDishes.filter(d => d.userId === userId)

    let brokenRecipes = 0, brokenDishes = 0
    let brokenRows = 0, fixable = 0, unlinkable = 0

    console.log(`\n── User: ${userId} ────────────────────────────`)
    console.log(`   Visible products: ${userProductIds.size} | recipes: ${userRecipes.length} | dishes: ${userDishes.length}`)

    console.log(`\n   Broken refs in RECIPE_LIST:`)
    for (const recipe of userRecipes) {
      const broken = (recipe.ingredients_ || []).filter(
        ing => ing.referenceId && !validRefs.has(ing.referenceId)
      )
      if (broken.length) {
        brokenRecipes++
        brokenRows += broken.length
        console.log(`     "${recipe.name_hebrew}" (${recipe._id}) — ${broken.length} broken`)
        broken.forEach(ing => {
          const ref = ing.referenceId
          const demoName = demoProducts.find(p => p._id === ref)?.name_hebrew
          const canFix = demoName && userNameToId.has(demoName)
          if (canFix) fixable++; else unlinkable++
          console.log(`       ${ref} → demo name: "${demoName ?? '?'}" → user match: ${canFix ? userNameToId.get(demoName) : 'NONE'}`)
          const prefix = ref?.replace(/_\d+$/, '_XXX') ?? 'unknown'
          brokenByPattern[prefix] = (brokenByPattern[prefix] ?? 0) + 1
        })
      }
    }
    if (brokenRecipes === 0) console.log(`     (none)`)

    console.log(`\n   Broken refs in DISH_LIST:`)
    for (const dish of userDishes) {
      const broken = (dish.ingredients_ || []).filter(
        ing => ing.referenceId && !validRefs.has(ing.referenceId)
      )
      if (broken.length) {
        brokenDishes++
        brokenRows += broken.length
        console.log(`     "${dish.name_hebrew}" (${dish._id}) — ${broken.length} broken`)
        broken.forEach(ing => {
          const ref = ing.referenceId
          const demoName = demoProducts.find(p => p._id === ref)?.name_hebrew
          const canFix = demoName && userNameToId.has(demoName)
          if (canFix) fixable++; else unlinkable++
          console.log(`       ${ref} → demo name: "${demoName ?? '?'}" → user match: ${canFix ? userNameToId.get(demoName) : 'NONE'}`)
          const prefix = ref?.replace(/_\d+$/, '_XXX') ?? 'unknown'
          brokenByPattern[prefix] = (brokenByPattern[prefix] ?? 0) + 1
        })
      }
    }
    if (brokenDishes === 0) console.log(`     (none)`)

    totalBrokenRows += brokenRows
    totalFixableRows += fixable
    totalUnlinkableRows += unlinkable

    console.log(`\n   Subtotal — broken: ${brokenRows} | fixable by name: ${fixable} | no match: ${unlinkable}`)
  }

  // 6. Summary
  console.log(`\n── Grand Summary ─────────────────────────────`)
  console.log(`  Total broken ingredient rows : ${totalBrokenRows}`)
  console.log(`  Fixable by name match        : ${totalFixableRows}`)
  console.log(`  Cannot fix (no name match)   : ${totalUnlinkableRows}`)
  console.log(`\n── Broken ref ID patterns ────────────────────`)
  Object.entries(brokenByPattern).sort((a, b) => b[1] - a[1]).forEach(([pattern, count]) => {
    console.log(`  ${pattern} × ${count}`)
  })

  await client.close()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
