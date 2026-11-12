'use strict'
/**
 * Plan 554 (C-KB): `publicFacts` is the one source of business facts the assistant may be given. Server-only; it
 * returns only the profile's own facts and the business's live, approved, public knowledge items, in a fixed order.
 */
const { KNOWLEDGE_TOPICS } = require('../generated/schemas/entities')

const MAX_CHARS = 6000

/** A value on one line: any run of line breaks becomes a single space. */
const oneLine = value => String(value).replace(/[\r\n]+/g, ' ').trim()

function profileLines(profile) {
  if (!profile) return []
  const lines = []
  if (profile.displayName) lines.push({ line: `[profile.displayName] name: ${oneLine(profile.displayName)}` })
  if (profile.phone) lines.push({ line: `[profile.phone] phone: ${oneLine(profile.phone)}` })
  if (profile.address) lines.push({ line: `[profile.address] address: ${oneLine(profile.address)}` })
  if (profile.serviceArea) lines.push({ line: `[profile.serviceArea] service area: ${oneLine(profile.serviceArea)}` })
  if (Array.isArray(profile.hours) && profile.hours.length) {
    const rows = profile.hours.map(row => oneLine(`${row.days} ${row.time}`)).join('; ')
    lines.push({ line: `[profile.hours] opening hours: ${rows}` })
  }
  if (Array.isArray(profile.closedDates) && profile.closedDates.length) {
    lines.push({ line: `[profile.closedDates] closed on: ${profile.closedDates.map(oneLine).join(', ')}` })
  }
  return lines
}

const topicIndex = topic => {
  const i = KNOWLEDGE_TOPICS.indexOf(topic)
  return i === -1 ? KNOWLEDGE_TOPICS.length : i
}

function itemLine(item) {
  const base = `[${item._id}] ${item.topic}: Q: ${oneLine(item.question)} | A: ${oneLine(item.answer)}`
  const variations = Array.isArray(item.variations) ? item.variations.map(oneLine).filter(Boolean) : []
  return { id: String(item._id), line: variations.length ? `${base} | also asked: ${variations.join('; ')}` : base }
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} businessId
 * @returns {Promise<{ text: string, factIds: string[] }>}
 */
async function publicFacts(db, businessId) {
  const profile = await db.collection('frontDeskProfiles').findOne({ businessId })
  const items = await db.collection('knowledgeItems')
    .find({ businessId, status: 'approved', visibility: 'public', deletedAt: { $exists: false } })
    .toArray()
  items.sort((a, b) =>
    topicIndex(a.topic) - topicIndex(b.topic) ||
    (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
    (String(a._id) < String(b._id) ? -1 : String(a._id) > String(b._id) ? 1 : 0))

  const lines = [...profileLines(profile), ...items.map(itemLine)]
  const kept = []
  let length = 0
  for (const entry of lines) {
    const next = length + (kept.length ? 1 : 0) + entry.line.length
    if (next > MAX_CHARS) break
    kept.push(entry)
    length = next
  }
  return {
    text: kept.map(entry => entry.line).join('\n'),
    factIds: kept.map(entry => entry.id ?? entry.line.slice(1, entry.line.indexOf(']'))),
  }
}

module.exports = { publicFacts, MAX_FACTS_CHARS: MAX_CHARS }
