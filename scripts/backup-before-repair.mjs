/**
 * Backup PRODUCT_LIST, RECIPE_LIST, DISH_LIST to backups/<timestamp>/ before repair.
 * Run: node scripts/backup-before-repair.mjs
 * Requires MONGO_REMOTE_URI or MONGO_URI in .env
 */
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, writeFileSync, existsSync, appendFileSync, readFileSync } from 'fs'

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

const COLLECTIONS = ['PRODUCT_LIST', 'RECIPE_LIST', 'DISH_LIST']
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = resolve(ROOT, 'backups', timestamp)

// Ensure backups/ is gitignored
const gitignorePath = resolve(ROOT, '.gitignore')
const gitignoreContent = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : ''
if (!gitignoreContent.includes('backups/')) {
  appendFileSync(gitignorePath, '\nbackups/\n')
  console.log('[backup] Added backups/ to .gitignore')
}

mkdirSync(backupDir, { recursive: true })

const client = new MongoClient(uri)

async function run() {
  await client.connect()
  const db = client.db()

  for (const col of COLLECTIONS) {
    const docs = await db.collection(col).find({}).toArray()
    const outPath = resolve(backupDir, `${col}.json`)
    writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf8')
    console.log(`[backup] ${col}: ${docs.length} docs → ${outPath}`)
    if (docs.length === 0) {
      console.error(`[backup] ERROR: ${col} returned 0 docs — aborting`)
      await client.close()
      process.exit(1)
    }
  }

  console.log(`\n[backup] Done. All files written to: ${backupDir}`)
  await client.close()
}

run().catch(err => {
  console.error('[backup] FATAL:', err.message)
  process.exit(1)
})
