/**
 * Merge duplicate dietary label strings (Plan 320 Milestone 1).
 *
 * Scope: only the 5 clusters confirmed as genuine same-concept duplicates
 * (see plans/320-recipe-labels-fix-course-category-field.plan.md Milestone 1
 * scope-correction note). The other 4 audit clusters (meat/salads/soups/dessert)
 * are course strings mis-clustered by audit-labels.mjs's fuzzy matching and are
 * explicitly NOT touched here — they're Milestone 2's job.
 *
 * For each cluster, orphan member strings in labels_/autoLabels_ are rewritten
 * to the canonical key (array deduped after rewrite). Canonical keys missing
 * from a userId's KITCHEN_LABELS registry are registered first, so the merge
 * target is always selectable in the recipe-builder dropdown.
 *
 * Flags:
 *   --write     Apply changes (default: dry-run, report only)
 *   --remote    Use MONGO_REMOTE_URI || MONGO_URI (Atlas). Default: local.
 *
 * Always writes a mutation log (dry-run or write) to
 * .claude/reports/label-audit/merge-log-<local|remote>-<timestamp>.json
 *
 * Run: node scripts/merge-labels.mjs [--write] [--remote]
 */
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, writeFileSync } from 'fs'
import dns from 'dns'
import dnsPromises from 'dns/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const require = createRequire(resolve(ROOT, 'server', 'package.json'))
const { MongoClient } = require('mongodb')
const { config } = require('dotenv')

config({ path: resolve(ROOT, 'server', '.env') })
config({ path: resolve(ROOT, '.env') })

const WRITE = process.argv.includes('--write')
const REMOTE = process.argv.includes('--remote')

const envVarName = REMOTE
  ? (process.env.MONGO_REMOTE_URI ? 'MONGO_REMOTE_URI' : 'MONGO_URI')
  : (process.env.MONGO_LOCAL_URI ? 'MONGO_LOCAL_URI' : 'MONGO_URI')
const uri = REMOTE
  ? (process.env.MONGO_REMOTE_URI || process.env.MONGO_URI)
  : (process.env.MONGO_LOCAL_URI || process.env.MONGO_URI)

if (!uri) {
  console.error(`ERROR: No MongoDB URI found in .env (checked ${REMOTE ? 'MONGO_REMOTE_URI / MONGO_URI' : 'MONGO_LOCAL_URI / MONGO_URI'})`)
  process.exit(1)
}

function maskHost(rawUri) {
  const match = rawUri.match(/@([^/?]+)/) || rawUri.match(/:\/\/([^/?]+)/)
  return match ? match[1] : '<unparseable host>'
}
const maskedHost = maskHost(uri)
console.log(`[merge-labels] ${WRITE ? 'WRITE' : 'DRY-RUN'} mode — ${REMOTE ? 'REMOTE' : 'LOCAL'} — env var: ${envVarName}, host: ${maskedHost}`)

// Some local DNS resolvers refuse direct SRV queries (ECONNREFUSED) even though
// the OS resolver handles them fine. Detect that and fall back to a public
// resolver for this process only — no effect on the app or its config.
if (uri.startsWith('mongodb+srv://')) {
  try {
    await dnsPromises.resolveSrv(`_mongodb._tcp.${maskedHost}`)
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('[merge-labels] Local DNS resolver refused SRV lookup — falling back to public resolver (8.8.8.8, 1.1.1.1) for this process only.')
      dns.setServers(['8.8.8.8', '1.1.1.1'])
    } else {
      throw err
    }
  }
}

// ─── The 5 confirmed genuine-duplicate clusters (Plan 320 M1 scope) ─────────
const CLUSTERS = [
  { canonical: 'dairy', orphans: ['dairy_prep', 'dairy_sauce'] },
  { canonical: 'vegan', orphans: ['טבעוני'] },
  { canonical: 'marinade', orphans: ['מרינדה'] },
  { canonical: 'asian', orphans: ['אסייתי'] },
  { canonical: 'sipur_shel_ochel', orphans: ['סיפור של אוכל'] }
]

const ORPHAN_TO_CANONICAL = new Map()
for (const { canonical, orphans } of CLUSTERS) {
  for (const o of orphans) ORPHAN_TO_CANONICAL.set(o, canonical)
}
const CANONICAL_KEYS = new Set(CLUSTERS.map(c => c.canonical))

const LABEL_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#78716C'
]

function rewriteArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  let changed = false
  const mapped = arr.map(s => {
    if (ORPHAN_TO_CANONICAL.has(s)) { changed = true; return ORPHAN_TO_CANONICAL.get(s) }
    return s
  })
  const deduped = [...new Set(mapped)]
  if (deduped.length !== mapped.length) changed = true
  if (!changed) return null
  return deduped
}

const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db()

  // ── Step 1: registration — ensure every canonical key exists in every userId's KITCHEN_LABELS ──
  const labelDocs = await db.collection('KITCHEN_LABELS').find({}).toArray()
  const registrations = [] // { userId, key, color }
  for (const doc of labelDocs) {
    const items = Array.isArray(doc.items) ? doc.items : []
    const existingKeys = new Set(items.map(i => i.key))
    const usedColors = new Set(items.map(i => i.color))
    for (const key of CANONICAL_KEYS) {
      if (existingKeys.has(key)) continue
      const color = LABEL_COLOR_PALETTE.find(c => !usedColors.has(c)) ?? LABEL_COLOR_PALETTE[0]
      usedColors.add(color)
      registrations.push({ userId: doc.userId, key, color, docId: doc._id })
    }
  }

  console.log(`\n[registrations] ${registrations.length} missing (userId, canonical key) registration(s):`)
  for (const r of registrations) console.log(`  userId=${r.userId}  key=${r.key}  color=${r.color}`)

  // ── Step 2: scan RECIPE_LIST / DISH_LIST for orphan members ──────────────
  const collections = ['RECIPE_LIST', 'DISH_LIST']
  const docMutations = [] // { collection, _id, userId, name, field, before, after }
  for (const coll of collections) {
    const docs = await db.collection(coll).find({}).toArray()
    for (const doc of docs) {
      for (const field of ['labels_', 'autoLabels_']) {
        const before = doc[field]
        const after = rewriteArray(before)
        if (after) {
          docMutations.push({
            collection: coll,
            docId: doc._id,
            _id: String(doc._id),
            userId: doc.userId ?? '(no userId)',
            name: doc.name_hebrew ?? '(no name)',
            field,
            before,
            after
          })
        }
      }
    }
  }

  console.log(`\n[recipe/dish mutations] ${docMutations.length} field(s) across ${new Set(docMutations.map(m => m._id)).size} document(s) would change:`)
  for (const m of docMutations.slice(0, 20)) {
    console.log(`  ${m.collection} ${m._id} (${m.name}) .${m.field}: [${m.before.join(', ')}] -> [${m.after.join(', ')}]`)
  }
  if (docMutations.length > 20) console.log(`  ... and ${docMutations.length - 20} more (see log file)`)

  // ── Always write the mutation log, dry-run or not ────────────────────────
  const outDir = resolve(ROOT, '.claude', 'reports', 'label-audit')
  mkdirSync(outDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logPath = resolve(outDir, `merge-log-${REMOTE ? 'remote' : 'local'}-${timestamp}.json`)
  writeFileSync(logPath, JSON.stringify({
    meta: { generatedAt: new Date().toISOString(), mode: REMOTE ? 'remote' : 'local', write: WRITE, envVar: envVarName, maskedHost },
    clusters: CLUSTERS,
    registrations,
    docMutations
  }, null, 2), 'utf8')
  console.log(`\nMutation log written: ${logPath}`)

  if (!WRITE) {
    console.log(`\n[dry-run] Would register ${registrations.length} label(s) and update ${docMutations.length} field(s). Pass --write to apply.`)
    return
  }

  // ── Step 3: apply registrations ──────────────────────────────────────────
  const registrationsByDoc = new Map()
  for (const r of registrations) {
    if (!registrationsByDoc.has(r.docId)) registrationsByDoc.set(r.docId, [])
    registrationsByDoc.get(r.docId).push({ key: r.key, color: r.color, autoTriggers: [] })
  }
  for (const [docId, items] of registrationsByDoc) {
    await db.collection('KITCHEN_LABELS').updateOne(
      { _id: docId },
      { $push: { items: { $each: items } } }
    )
  }
  console.log(`[write] Registered ${registrations.length} label(s) across ${registrationsByDoc.size} KITCHEN_LABELS doc(s).`)

  // ── Step 4: apply doc field rewrites ─────────────────────────────────────
  let applied = 0
  for (const m of docMutations) {
    await db.collection(m.collection).updateOne(
      { _id: m.docId },
      { $set: { [m.field]: m.after } }
    )
    applied++
  }
  console.log(`[write] Updated ${applied} field(s) across RECIPE_LIST/DISH_LIST.`)
}

/** Redacts any embedded connection-string credentials before an error ever reaches a log. */
function redactCredentials(err) {
  const message = err instanceof Error ? err.message : String(err)
  return message.replace(/:\/\/[^@/\s]+@/g, '://<redacted>@')
}

main()
  .catch(err => {
    console.error(`[merge-labels] FAILED: ${redactCredentials(err)}`)
    process.exit(1)
  })
  .finally(() => client.close())
