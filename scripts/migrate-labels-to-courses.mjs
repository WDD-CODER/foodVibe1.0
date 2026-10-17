/**
 * Migrate course-like strings out of labels_/autoLabels_ into the new course_ field
 * (Plan 320 Milestone 2).
 *
 * Scope: the course strings seeded as DEFAULT_COURSES in server/services/seed-master.js
 * (kept in sync here — see that file's DEFAULT_COURSES constant; trimmed by plan 376). For every recipe/dish
 * where labels_ or autoLabels_ contains exactly one of these strings: set course_ to it and
 * remove it from labels_/autoLabels_. A recipe carrying MORE than one course-like string
 * cannot be resolved automatically (course_ is single-select) — it goes into a conflict
 * list for Human review instead of being silently guessed.
 *
 * Flags:
 *   --write     Apply changes (default: dry-run, report only)
 *   --remote    Use MONGO_REMOTE_URI || MONGO_URI (Atlas). Default: local.
 *
 * Always writes a mutation log + conflict list (dry-run or write) to
 * .claude/reports/label-audit/migrate-courses-log-<local|remote>-<timestamp>.json
 *
 * Run: node scripts/migrate-labels-to-courses.mjs [--write] [--remote]
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
console.log(`[migrate-courses] ${WRITE ? 'WRITE' : 'DRY-RUN'} mode — ${REMOTE ? 'REMOTE' : 'LOCAL'} — env var: ${envVarName}, host: ${maskedHost}`)

if (uri.startsWith('mongodb+srv://')) {
  try {
    await dnsPromises.resolveSrv(`_mongodb._tcp.${maskedHost}`)
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('[migrate-courses] Local DNS resolver refused SRV lookup — falling back to public resolver (8.8.8.8, 1.1.1.1) for this process only.')
      dns.setServers(['8.8.8.8', '1.1.1.1'])
    } else {
      throw err
    }
  }
}

// ─── Must stay in sync with DEFAULT_COURSES in server/services/seed-master.js (plan 376) ───
const COURSE_STRINGS = new Set([
  'amuse_bouche',
  'bread_focaccia_savory_baking',
  'cakes_cookies_tarts',
  'charcuterie_meat_mass_meat_preps',
  'desserts',
  'fermentation_curing_pickling',
  'fish_shellfish_sauce',
  'foams_hot_cold',
  'general_preps',
  'grains_side_dish',
  'jams_sweet_preps_syrup',
  'legume_side_dish',
  'main_dish',
  'main_dish_chicken',
  'main_dish_fish',
  'main_dish_meat',
  'main_dish_vegetarian',
  'main_seafood',
  'meat_sauce',
  'oils_and_infusions',
  'pasta_dish',
  'pasta_prep',
  'pastry_sweets',
  'pork_dish',
  'powders_spice_mixes_dry_preps',
  'pre_dessert',
  'salad_sauce',
  'salads',
  'salty_baking_doughs',
  'sauces_cold_hot_savory',
  'side_dish',
  'sorbet_ice_cream_granita',
  'soups',
  'soups_stocks_cooking_liquids',
  'spreads_dips_salty_creams',
  'starch_side_dish',
  'starter',
  'starter_chicken',
  'starter_fish',
  'starter_meat',
  'starter_seafood',
  'starter_vegetarian',
  'stews_cookery',
  'sweet_baking_doughs',
  'sweet_creams_custards_mousse',
  'sweet_sauce',
  'vegetable_side_dish',
  'vegetables_snacks_add_ons',
  'vinaigrettes_mayonnaise_emulsion',
  'גלייז',
  'רוטב',
])

// Human-confirmed resolutions for specific multi-match conflicts (Plan 320 M2.11).
// Key: courseMatches sorted + joined with '|'. Value: which one wins as course_ — the
// other match stays untouched in labels_/autoLabels_ rather than being silently dropped.
const CONFLICT_RESOLUTIONS = new Map([
  // "גלייז קוריאני" (Korean glaze) — tagged both רוטב (sauce) and גלייז (glaze); glaze is
  // the more specific/accurate course. רוטב is left as a leftover label, not removed.
  [['גלייז', 'רוטב'].sort().join('|'), 'גלייז']
])

const LABEL_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#78716C'
]

const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db()

  // ── Step 0: seed KITCHEN_COURSES for every userId that has a KITCHEN_LABELS doc ──
  // Mirrors the client-side lazy-seed in metadata-registry.service.ts, needed here because
  // that seed only fires when each user actually logs into the app — this makes the course
  // dropdown work immediately for users who haven't opened the app since this shipped.
  const labelDocs = await db.collection('KITCHEN_LABELS').find({}).toArray()
  const courseDocs = await db.collection('KITCHEN_COURSES').find({}).toArray()
  const seededUserIds = new Set(courseDocs.map((d) => d.userId))
  const registrySeeds = [] // { userId }
  for (const doc of labelDocs) {
    if (seededUserIds.has(doc.userId)) continue
    seededUserIds.add(doc.userId)
    registrySeeds.push({ userId: doc.userId })
  }
  console.log(`\n[course-registry] ${registrySeeds.length} userId(s) missing a KITCHEN_COURSES doc: ${registrySeeds.map((r) => r.userId).join(', ') || '(none)'}`)
  if (WRITE) {
    for (const { userId } of registrySeeds) {
      const items = [...COURSE_STRINGS].map((key, i) => ({ key, color: LABEL_COLOR_PALETTE[i % LABEL_COLOR_PALETTE.length] }))
      await db.collection('KITCHEN_COURSES').insertOne({ userId, items })
    }
    if (registrySeeds.length > 0) console.log(`[write] Seeded KITCHEN_COURSES for ${registrySeeds.length} userId(s).`)
  }

  const collections = ['RECIPE_LIST', 'DISH_LIST']
  const resolved = [] // { collection, docId, _id, userId, name, course, removedFrom: {labels_, autoLabels_} }
  const conflicts = [] // { collection, docId, _id, userId, name, courseMatches }

  for (const coll of collections) {
    const docs = await db.collection(coll).find({}).toArray()
    for (const doc of docs) {
      const labels = doc.labels_ ?? []
      const autoLabels = doc.autoLabels_ ?? []
      const courseMatches = [...new Set([...labels, ...autoLabels].filter((s) => COURSE_STRINGS.has(s)))]

      if (courseMatches.length === 0) continue

      if (doc.course_ && !courseMatches.includes(doc.course_)) {
        // Recipe already has a manually-set course_ that differs from what's found in
        // labels_/autoLabels_ — treat as a conflict rather than silently overwriting it.
        conflicts.push({
          collection: coll,
          docId: doc._id,
          _id: String(doc._id),
          userId: doc.userId ?? '(no userId)',
          name: doc.name_hebrew ?? '(no name)',
          reason: 'existing_course_differs',
          existingCourse: doc.course_,
          courseMatches
        })
        continue
      }

      let course
      if (courseMatches.length > 1) {
        const resolutionKey = [...courseMatches].sort().join('|')
        const humanResolved = CONFLICT_RESOLUTIONS.get(resolutionKey)
        if (!humanResolved) {
          conflicts.push({
            collection: coll,
            docId: doc._id,
            _id: String(doc._id),
            userId: doc.userId ?? '(no userId)',
            name: doc.name_hebrew ?? '(no name)',
            reason: 'multiple_course_matches',
            courseMatches
          })
          continue
        }
        course = humanResolved
      } else {
        course = courseMatches[0]
      }

      const newLabels = labels.filter((s) => s !== course)
      const newAutoLabels = autoLabels.filter((s) => s !== course)
      resolved.push({
        collection: coll,
        docId: doc._id,
        _id: String(doc._id),
        userId: doc.userId ?? '(no userId)',
        name: doc.name_hebrew ?? '(no name)',
        course,
        before: { labels_: labels, autoLabels_: autoLabels },
        after: { labels_: newLabels, autoLabels_: newAutoLabels }
      })
    }
  }

  console.log(`\n[resolved] ${resolved.length} document(s) would get course_ set (unambiguous single match):`)
  for (const r of resolved.slice(0, 20)) {
    console.log(`  ${r.collection} ${r._id} (${r.name}): course_ = "${r.course}"`)
  }
  if (resolved.length > 20) console.log(`  ... and ${resolved.length - 20} more (see log file)`)

  console.log(`\n[conflicts] ${conflicts.length} document(s) need Human review (not auto-resolved):`)
  for (const c of conflicts.slice(0, 20)) {
    console.log(`  ${c.collection} ${c._id} (${c.name}) [${c.reason}]: ${JSON.stringify(c.courseMatches)}${c.existingCourse ? ` (existing course_: ${c.existingCourse})` : ''}`)
  }
  if (conflicts.length > 20) console.log(`  ... and ${conflicts.length - 20} more (see log file)`)

  const outDir = resolve(ROOT, '.claude', 'reports', 'label-audit')
  mkdirSync(outDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logPath = resolve(outDir, `migrate-courses-log-${REMOTE ? 'remote' : 'local'}-${timestamp}.json`)
  writeFileSync(logPath, JSON.stringify({
    meta: { generatedAt: new Date().toISOString(), mode: REMOTE ? 'remote' : 'local', write: WRITE, envVar: envVarName, maskedHost },
    resolved,
    conflicts
  }, null, 2), 'utf8')
  console.log(`\nLog written: ${logPath}`)

  if (!WRITE) {
    console.log(`\n[dry-run] Would set course_ on ${resolved.length} document(s), leaving ${conflicts.length} for Human review. Pass --write to apply.`)
    return
  }

  let applied = 0
  for (const r of resolved) {
    await db.collection(r.collection).updateOne(
      { _id: r.docId },
      { $set: { course_: r.course, labels_: r.after.labels_, autoLabels_: r.after.autoLabels_ } }
    )
    applied++
  }
  console.log(`[write] Updated ${applied} document(s). ${conflicts.length} conflict(s) left untouched for Human review.`)
}

/** Redacts any embedded connection-string credentials before an error ever reaches a log. */
function redactCredentials(err) {
  const message = err instanceof Error ? err.message : String(err)
  return message.replace(/:\/\/[^@/\s]+@/g, '://<redacted>@')
}

main()
  .catch(err => {
    console.error(`[migrate-courses] FAILED: ${redactCredentials(err)}`)
    process.exit(1)
  })
  .finally(() => client.close())
