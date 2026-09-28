/**
 * Read-only label audit.
 *
 * Explains why migrated labels are invisible in the recipe editor and proposes
 * merge clusters for near-duplicate label strings. Makes no writes — find() only.
 *
 * Flags:
 *   --remote           Use MONGO_REMOTE_URI || MONGO_URI (Atlas). Default: local.
 *   --userId=<id>      Restrict Sections B-E to one userId (registry Section A always shows all).
 *
 * Run: node scripts/audit-labels.mjs [--remote] [--userId=<id>]
 */
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import dns from 'dns'
import dnsPromises from 'dns/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const require = createRequire(resolve(ROOT, 'server', 'package.json'))
const { MongoClient } = require('mongodb')
const { config } = require('dotenv')

config({ path: resolve(ROOT, 'server', '.env') })
config({ path: resolve(ROOT, '.env') })

const REMOTE = process.argv.includes('--remote')
const userIdArg = process.argv.find(a => a.startsWith('--userId='))
const USER_ID_FILTER = userIdArg ? userIdArg.slice('--userId='.length) : null

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
console.log(`[audit-labels] ${REMOTE ? 'REMOTE' : 'LOCAL'} mode — env var: ${envVarName}, host: ${maskedHost}`)
if (USER_ID_FILTER) console.log(`[audit-labels] Filtering Sections B-E to userId: ${USER_ID_FILTER}`)

// Some local DNS resolvers refuse direct SRV queries (ECONNREFUSED) even though
// the OS resolver handles them fine. Detect that and fall back to a public
// resolver for this process only — no effect on the app or its config.
if (uri.startsWith('mongodb+srv://')) {
  try {
    await dnsPromises.resolveSrv(`_mongodb._tcp.${maskedHost}`)
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('[audit-labels] Local DNS resolver refused SRV lookup — falling back to public resolver (8.8.8.8, 1.1.1.1) for this process only.')
      dns.setServers(['8.8.8.8', '1.1.1.1'])
    } else {
      throw err
    }
  }
}

// ─── Dictionary (Hebrew/English matching) ───────────────────────────────────

function loadDictionary() {
  const dictPath = resolve(ROOT, 'public', 'assets', 'data', 'dictionary.json')
  const raw = JSON.parse(readFileSync(dictPath, 'utf8'))
  const flattened = {
    ...(raw.units ?? {}),
    ...(raw.categories ?? {}),
    ...(raw.section_categories ?? {}),
    ...(raw.allergens ?? {}),
    ...(raw.actions ?? {}),
    ...(raw.preparation_categories ?? {}),
    ...(raw.export_headers ?? {}),
    ...(raw.general ?? {})
  }
  return flattened
}

function translate(dict, key) {
  if (!key) return ''
  const normalizedKey = String(key).trim().toLowerCase()
  return dict[normalizedKey] || key
}

// ─── Normalization + Levenshtein (Section D) ────────────────────────────────

const NIQQUD_RE = /[֑-ׇ]/g

function normalize(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .replace(NIQQUD_RE, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

// ─── Main ────────────────────────────────────────────────────────────────────

const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db()
  const dict = loadDictionary()

  // ── Section A: registry ──────────────────────────────────────────────────
  const labelDocs = await db.collection('KITCHEN_LABELS').find({}).toArray()
  const registryByUser = new Map() // userId -> LabelDefinition[]
  for (const doc of labelDocs) {
    const uid = doc.userId ?? '(no userId)'
    registryByUser.set(uid, Array.isArray(doc.items) ? doc.items : [])
  }
  const registryKeysByUser = new Map()
  for (const [uid, items] of registryByUser) {
    registryKeysByUser.set(uid, new Set(items.map(l => l.key)))
  }
  // Any key registered for ANY user (incl. __master__) — for Section C "registered-other-user"
  const keyRegisteredSomewhere = new Map() // key -> Set<userId>
  for (const [uid, items] of registryByUser) {
    for (const l of items) {
      if (!keyRegisteredSomewhere.has(l.key)) keyRegisteredSomewhere.set(l.key, new Set())
      keyRegisteredSomewhere.get(l.key).add(uid)
    }
  }

  // ── Section B: usage scan ────────────────────────────────────────────────
  const recipeFilter = USER_ID_FILTER ? { userId: USER_ID_FILTER } : {}
  const recipes = await db.collection('RECIPE_LIST').find(recipeFilter).toArray()
  const dishes = await db.collection('DISH_LIST').find(recipeFilter).toArray()
  const allRecipeDocs = [
    ...recipes.map(r => ({ ...r, __collection: 'RECIPE_LIST' })),
    ...dishes.map(d => ({ ...d, __collection: 'DISH_LIST' }))
  ]

  // usage: string -> { fields: Set, count, userIds: Set, entries: [{name,_id,userId,collection,field}] }
  const usage = new Map()
  function recordUsage(str, field, doc) {
    if (!str) return
    if (!usage.has(str)) usage.set(str, { fields: new Set(), count: 0, userIds: new Set(), entries: [] })
    const rec = usage.get(str)
    rec.fields.add(field)
    rec.count++
    rec.userIds.add(doc.userId ?? '(no userId)')
    rec.entries.push({
      name: doc.name_hebrew ?? '(no name)',
      _id: String(doc._id),
      userId: doc.userId ?? '(no userId)',
      collection: doc.__collection,
      field
    })
  }
  for (const doc of allRecipeDocs) {
    for (const l of (doc.labels_ ?? [])) recordUsage(l, 'labels_', doc)
    for (const l of (doc.autoLabels_ ?? [])) recordUsage(l, 'autoLabels_', doc)
  }

  // Flag other top-level array-of-string fields (possible migrated labels elsewhere)
  const KNOWN_ARRAY_FIELDS = new Set(['labels_', 'autoLabels_', 'ingredients_', 'steps_', 'hiddenBy', 'favoritedBy_', 'version_history_', 'prep_items_', 'prep_categories_', 'yield_conversions_'])
  const otherArrayFields = new Set()
  for (const doc of allRecipeDocs) {
    for (const [key, val] of Object.entries(doc)) {
      if (KNOWN_ARRAY_FIELDS.has(key) || key.startsWith('__') || key === '_id') continue
      if (Array.isArray(val) && val.length > 0 && val.every(v => typeof v === 'string')) {
        otherArrayFields.add(key)
      }
    }
  }

  // ── Section C: classification ────────────────────────────────────────────
  // Classify per (string, userId) since the registry is user-scoped.
  const classificationCounts = { registered: 0, 'registered-via-translation': 0, 'registered-other-user': 0, orphan: 0 }
  const classifiedRows = [] // { string, userId, classification, count(recipes for that user), }

  for (const [str, rec] of usage) {
    for (const uid of rec.userIds) {
      const userKeys = registryKeysByUser.get(uid) ?? new Set()
      let classification
      if (userKeys.has(str)) {
        classification = 'registered'
      } else {
        const strTranslated = translate(dict, str)
        const userItems = registryByUser.get(uid) ?? []
        const viaTranslation = userItems.some(def => translate(dict, def.key) === strTranslated && strTranslated !== str)
        if (viaTranslation) {
          classification = 'registered-via-translation'
        } else if (keyRegisteredSomewhere.has(str) && ![...keyRegisteredSomewhere.get(str)].every(u => u === uid)) {
          classification = 'registered-other-user'
        } else {
          classification = 'orphan'
        }
      }
      const countForUser = rec.entries.filter(e => e.userId === uid).length
      classificationCounts[classification] += countForUser
      classifiedRows.push({ string: str, userId: uid, classification, count: countForUser })
    }
  }

  // Orphan strings (any (string,userId) pair classified orphan) — attach up to 3 samples
  const orphanSamples = new Map() // `${string}|${userId}` -> entries[0..3]
  for (const row of classifiedRows) {
    if (row.classification !== 'orphan') continue
    const rec = usage.get(row.string)
    const samples = rec.entries.filter(e => e.userId === row.userId).slice(0, 3)
    orphanSamples.set(`${row.string}|${row.userId}`, samples)
  }

  // ── Section D: merge clusters ────────────────────────────────────────────
  const distinctStrings = [...usage.keys()]
  const normById = distinctStrings.map(s => ({ str: s, norm: normalize(s), tokens: new Set(normalize(s).split(' ')) }))

  // union-find
  const parent = new Map(distinctStrings.map(s => [s, s]))
  function find(x) { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)))
      x = parent.get(x) } return x }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb) }

  for (let i = 0; i < normById.length; i++) {
    for (let j = i + 1; j < normById.length; j++) {
      const A = normById[i], B = normById[j]
      let related = false
      if (A.norm && A.norm === B.norm) related = true
      else if (A.tokens.size && B.tokens.size) {
        const smaller = A.tokens.size <= B.tokens.size ? A.tokens : B.tokens
        const larger = A.tokens.size <= B.tokens.size ? B.tokens : A.tokens
        if ([...smaller].every(t => larger.has(t))) related = true
      }
      if (!related) {
        const tA = translate(dict, A.str), tB = translate(dict, B.str)
        if (tA === tB || normalize(tA) === B.norm || normalize(tB) === A.norm) related = true
      }
      if (!related && A.norm && B.norm && levenshtein(A.norm, B.norm) <= 2) related = true
      if (related) union(A.str, B.str)
    }
  }

  const clusterMap = new Map() // root -> string[]
  for (const s of distinctStrings) {
    const root = find(s)
    if (!clusterMap.has(root)) clusterMap.set(root, [])
    clusterMap.get(root).push(s)
  }

  const clusters = []
  for (const members of clusterMap.values()) {
    if (members.length < 2) continue
    const memberDetails = members.map(m => {
      const rec = usage.get(m)
      const isRegisteredAnywhere = keyRegisteredSomewhere.has(m)
      return { string: m, count: rec.count, registeredAnywhere: isRegisteredAnywhere }
    })
    memberDetails.sort((a, b) => b.count - a.count)
    const canonicalCandidate = memberDetails.find(m => m.registeredAnywhere) ?? memberDetails[0]
    // recipes carrying more than one member
    const perDocMembers = new Map() // docKey -> Set(members present)
    for (const m of members) {
      for (const e of usage.get(m).entries) {
        const docKey = `${e.collection}|${e._id}`
        if (!perDocMembers.has(docKey)) perDocMembers.set(docKey, new Set())
        perDocMembers.get(docKey).add(m)
      }
    }
    const multiMemberDocs = [...perDocMembers.values()].filter(set => set.size > 1).length
    clusters.push({
      members: memberDetails,
      canonical: canonicalCandidate.string,
      multiMemberRecipeCount: multiMemberDocs
    })
  }
  clusters.sort((a, b) => b.members.reduce((s, m) => s + m.count, 0) - a.members.reduce((s, m) => s + m.count, 0))

  // ── Section E: orphan evidence (auto-trigger redundancy) ────────────────
  const productCache = new Map() // `${userId}|${_id}` -> product doc
  async function getProduct(userId, id) {
    const key = `${userId}|${id}`
    if (productCache.has(key)) return productCache.get(key)
    const p = await db.collection('PRODUCT_LIST').findOne({ _id: id, userId })
    productCache.set(key, p)
    return p
  }

  const orphanEvidence = [] // { string, userId, recipesWithMatch, recipesTotal }
  const orphanGroups = new Map() // `${string}|${userId}` -> recipe docs
  for (const doc of allRecipeDocs) {
    const uid = doc.userId ?? '(no userId)'
    for (const l of new Set([...(doc.labels_ ?? []), ...(doc.autoLabels_ ?? [])])) {
      const row = classifiedRows.find(r => r.string === l && r.userId === uid)
      if (row?.classification === 'orphan') {
        const key = `${l}|${uid}`
        if (!orphanGroups.has(key)) orphanGroups.set(key, [])
        orphanGroups.get(key).push(doc)
      }
    }
  }

  for (const [key, docs] of orphanGroups) {
    const [str, uid] = key.split('|')
    const userLabels = registryByUser.get(uid) ?? []
    let matchCount = 0
    for (const doc of docs) {
      const productIds = (doc.ingredients_ ?? [])
        .filter(ing => ing.type === 'product')
        .map(ing => ing.referenceId)
        .filter(Boolean)
      const triggerSet = new Set()
      for (const pid of productIds) {
        const p = await getProduct(uid, pid)
        if (!p) continue
        for (const c of (p.categories_ ?? [])) triggerSet.add(c)
        for (const a of (p.allergens_ ?? [])) triggerSet.add(a)
      }
      const hasMatch = userLabels.some(def => def.autoTriggers?.some(t => triggerSet.has(t)))
      if (hasMatch) matchCount++
    }
    orphanEvidence.push({ string: str, userId: uid, recipesWithMatch: matchCount, recipesTotal: docs.length })
  }

  // ── Assemble output ──────────────────────────────────────────────────────
  const data = {
    meta: {
      generatedAt: new Date().toISOString(),
      mode: REMOTE ? 'remote' : 'local',
      envVar: envVarName,
      maskedHost,
      userIdFilter: USER_ID_FILTER
    },
    sectionA_registry: [...registryByUser.entries()].map(([userId, items]) => ({ userId, items })),
    sectionB_usage: [...usage.entries()].map(([string, rec]) => ({
      string,
      fields: [...rec.fields],
      count: rec.count,
      userIds: [...rec.userIds],
      sampleEntries: rec.entries.slice(0, 3)
    })),
    sectionB_otherArrayFields: [...otherArrayFields],
    sectionC_classification: classifiedRows,
    sectionC_summaryCounts: classificationCounts,
    sectionC_orphanSamples: [...orphanSamples.entries()].map(([key, entries]) => {
      const [string, userId] = key.split('|')
      return { string, userId, sampleEntries: entries }
    }),
    sectionD_clusters: clusters,
    sectionE_orphanEvidence: orphanEvidence
  }

  const outDir = resolve(ROOT, '.claude', 'reports', 'label-audit')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'data.json'), JSON.stringify(data, null, 2), 'utf8')

  // ── report.md ─────────────────────────────────────────────────────────────
  const lines = []
  lines.push('# Label Audit Report', '')
  lines.push(`Generated: ${data.meta.generatedAt}`)
  lines.push(`Mode: ${data.meta.mode} — env var \`${data.meta.envVar}\`, host \`${data.meta.maskedHost}\``)
  if (USER_ID_FILTER) lines.push(`Filtered to userId: \`${USER_ID_FILTER}\``)
  lines.push('')

  lines.push('## Section A — Registry (KITCHEN_LABELS)', '')
  for (const { userId, items } of data.sectionA_registry) {
    lines.push(`### userId: \`${userId}\` (${items.length} labels)`, '')
    lines.push('| key | color | autoTriggers |', '| --- | --- | --- |')
    for (const it of items) lines.push(`| ${it.key} | ${it.color} | ${(it.autoTriggers ?? []).join(', ')} |`)
    lines.push('')
  }

  lines.push('## Section B — Usage', '')
  lines.push('| string | fields | count | userIds | other array fields seen |', '| --- | --- | --- | --- | --- |')
  const sortedUsage = [...data.sectionB_usage].sort((a, b) => b.count - a.count)
  for (const u of sortedUsage) {
    lines.push(`| ${u.string} | ${u.fields.join(', ')} | ${u.count} | ${u.userIds.join(', ')} | |`)
  }
  lines.push('')
  lines.push(`Other top-level array-of-string fields flagged across RECIPE_LIST/DISH_LIST docs: ${data.sectionB_otherArrayFields.length ? data.sectionB_otherArrayFields.join(', ') : '(none found)'}`, '')

  lines.push('## Section C — Classification', '')
  lines.push(`Counts (in recipe-occurrences, not distinct strings): registered=${classificationCounts.registered}, registered-via-translation=${classificationCounts['registered-via-translation']}, registered-other-user=${classificationCounts['registered-other-user']}, orphan=${classificationCounts.orphan}`, '')
  lines.push('| string | userId | classification | recipe count |', '| --- | --- | --- | --- |')
  for (const row of [...classifiedRows].sort((a, b) => b.count - a.count)) {
    lines.push(`| ${row.string} | ${row.userId} | ${row.classification} | ${row.count} |`)
  }
  lines.push('')
  lines.push('### Orphan samples (up to 3 recipes each)', '')
  lines.push('| string | userId | sample recipes |', '| --- | --- | --- |')
  for (const { string, userId, sampleEntries } of data.sectionC_orphanSamples) {
    const samples = sampleEntries.map(e => `${e.name} (\`${e._id}\`, ${e.collection}, ${e.field})`).join('; ')
    lines.push(`| ${string} | ${userId} | ${samples} |`)
  }
  lines.push('')

  lines.push('## Section D — Merge Clusters', '')
  lines.push('| canonical | members (count) | recipes carrying >1 member |', '| --- | --- | --- |')
  for (const c of clusters) {
    const memberStr = c.members.map(m => `${m.string} (${m.count}${m.registeredAnywhere ? ', registered' : ''})`).join(', ')
    lines.push(`| ${c.canonical} | ${memberStr} | ${c.multiMemberRecipeCount} |`)
  }
  lines.push('')

  lines.push('## Section E — Orphan evidence vs autoTriggers', '')
  lines.push('Counted only `type === \'product\'` ingredients, resolved against `PRODUCT_LIST` scoped to the same `userId` as the recipe (matches `computeAutoLabels` in `recipe-form.service.ts`). Sub-recipe ingredients are excluded, as in the app.', '')
  lines.push('| string | userId | recipes with autoTrigger match | recipes total |', '| --- | --- | --- | --- |')
  for (const e of [...orphanEvidence].sort((a, b) => b.recipesTotal - a.recipesTotal)) {
    lines.push(`| ${e.string} | ${e.userId} | ${e.recipesWithMatch} | ${e.recipesTotal} |`)
  }
  lines.push('')

  const dairyPrepRows = sortedUsage.filter(u => u.string === 'dairy prep' || u.string === 'dairy')
  lines.push('## "dairy prep" / "dairy" check', '')
  if (dairyPrepRows.length) {
    lines.push('| string | fields | count | userIds |', '| --- | --- | --- | --- |')
    for (const u of dairyPrepRows) lines.push(`| ${u.string} | ${u.fields.join(', ')} | ${u.count} | ${u.userIds.join(', ')} |`)
  } else {
    lines.push('Neither "dairy prep" nor "dairy" found verbatim in this run\'s data.')
  }
  lines.push('')

  writeFileSync(resolve(outDir, 'report.md'), lines.join('\n'), 'utf8')

  // ── Console summary ───────────────────────────────────────────────────────
  console.log('')
  console.log(`Total distinct label strings: ${distinctStrings.length}`)
  console.log(`Orphan (string,userId) pairs: ${classifiedRows.filter(r => r.classification === 'orphan').length}`)
  console.log(`Merge clusters (>1 member): ${clusters.length}`)
  console.log('Top 10 orphans by recipe count:')
  const topOrphans = classifiedRows.filter(r => r.classification === 'orphan').sort((a, b) => b.count - a.count).slice(0, 10)
  for (const o of topOrphans) console.log(`  ${o.string} (userId ${o.userId}): ${o.count} recipes`)
  console.log('"dairy prep" / "dairy" rows:')
  for (const u of dairyPrepRows) console.log(`  ${u.string}: ${u.count} recipes, userIds: ${u.userIds.join(', ')}`)

  console.log('')
  console.log(`Report written: ${resolve(outDir, 'report.md')}`)
  console.log(`Data written: ${resolve(outDir, 'data.json')}`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => client.close())
