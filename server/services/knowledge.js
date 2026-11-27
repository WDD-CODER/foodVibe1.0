'use strict'
/**
 * Plan 554 (C-KB): `publicFacts` is the one source of business facts the assistant may be given. Server-only; it
 * returns only the profile's own facts and the business's live, approved, public knowledge items, in a fixed order.
 * Plan 755 (R-32): when the lines do not all fit in 6,000 characters the profile's lines are always sent and the items
 * are picked by `pickFacts` for the guest's current message; `factIds` are exactly the lines that were sent.
 * Plan 760: how many characters is an engine setting (`factsMaxChars`).
 */
const { KNOWLEDGE_TOPICS } = require('../generated/schemas/entities')
const { pickFacts, TITLE_MAX } = require('./fact-pick')
const { ENGINE_DEFAULTS, loadEngine } = require('./assistant-engine-settings')

/** The default of the most characters of facts one turn sends (`factsMaxChars`). */
const MAX_CHARS = ENGINE_DEFAULTS.factsMaxChars

/** A value on one line: any run of line breaks becomes a single space. */
const oneLine = value => String(value).replace(/[\r\n]+/g, ' ').trim()

/** The profile's own facts, `{ id, line }` each: the basics, always sent. */
function profileLines(profile) {
  if (!profile) return []
  const lines = []
  const add = (id, text) => lines.push({ id, line: `[${id}] ${text}` })
  if (profile.displayName) add('profile.displayName', `name: ${oneLine(profile.displayName)}`)
  if (profile.phone) add('profile.phone', `phone: ${oneLine(profile.phone)}`)
  if (profile.address) add('profile.address', `address: ${oneLine(profile.address)}`)
  if (profile.serviceArea) add('profile.serviceArea', `service area: ${oneLine(profile.serviceArea)}`)
  if (Array.isArray(profile.hours) && profile.hours.length) {
    const rows = profile.hours.map(row => oneLine(`${row.days} ${row.time}`)).join('; ')
    add('profile.hours', `opening hours: ${rows}`)
  }
  if (Array.isArray(profile.closedDates) && profile.closedDates.length) {
    add('profile.closedDates', `closed on: ${profile.closedDates.map(oneLine).join(', ')}`)
  }
  return lines
}

const topicIndex = topic => {
  const i = KNOWLEDGE_TOPICS.indexOf(topic)
  return i === -1 ? KNOWLEDGE_TOPICS.length : i
}

/** One knowledge item as its fact line, with what the picker scores it by. */
function itemLine(item) {
  const base = `[${item._id}] ${item.topic}: Q: ${oneLine(item.question)} | A: ${oneLine(item.answer)}`
  const variations = Array.isArray(item.variations) ? item.variations.map(oneLine).filter(Boolean) : []
  return {
    id: String(item._id),
    line: variations.length ? `${base} | also asked: ${variations.join('; ')}` : base,
    title: oneLine(item.question).slice(0, TITLE_MAX),
    question: item.question,
    answer: item.answer,
    variations: item.variations ?? [],
  }
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} businessId
 * @param {{ query?: string, context?: string, budget?: number }} [ask] what the guest is asking now (`factQueryOf`)
 * @returns {Promise<{ text: string, factIds: string[], leftOutIds: string[], leftOutTitles: string[], stats: object }>}
 */
async function publicFacts(db, businessId, { query = '', context = '', budget } = {}) {
  const profile = await db.collection('frontDeskProfiles').findOne({ businessId })
  const items = await db.collection('knowledgeItems')
    .find({ businessId, status: 'approved', visibility: 'public', deletedAt: { $exists: false } })
    .toArray()
  items.sort((a, b) =>
    topicIndex(a.topic) - topicIndex(b.topic) ||
    (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
    (String(a._id) < String(b._id) ? -1 : String(a._id) > String(b._id) ? 1 : 0))

  const most = budget ?? (await loadEngine(db)).factsMaxChars
  return pickFacts({ core: profileLines(profile), items: items.map(itemLine), query, context, budget: most })
}

module.exports = { publicFacts, MAX_FACTS_CHARS: MAX_CHARS }
