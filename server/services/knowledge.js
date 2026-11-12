'use strict'
/**
 * Plan 554 (C-KB): the one source of business facts the assistant may be given (rule R-08).
 * Only approved, public, live items plus the profile's own facts; fixed order; at most MAX_FACTS_CHARS characters.
 */
const { KNOWLEDGE_TOPICS } = require('../generated/schemas/entities/knowledge-item.schema')

const MAX_FACTS_CHARS = 6000

/** A line break inside a stored value becomes one space. */
const oneLine = value => String(value).replace(/\s*[\r\n]+\s*/g, ' ').trim()

/** `[<tag>] label: value` lines of the profile, only for fields that have a value. */
function profileLines(profile) {
  if (!profile) return []
  const lines = []
  const add = (id, label, value) => {
    if (value === undefined || value === null) return
    const text = oneLine(value)
    if (text) lines.push({ id: null, text: `[${id}] ${label}: ${text}` })
  }
  add('profile.displayName', 'name', profile.displayName)
  add('profile.phone', 'phone', profile.phone)
  add('profile.address', 'address', profile.address)
  add('profile.serviceArea', 'service area', profile.serviceArea)
  if (Array.isArray(profile.hours) && profile.hours.length) {
    add('profile.hours', 'opening hours', profile.hours.map(h => oneLine(`${h.days} ${h.time}`)).join('; '))
  }
  if (Array.isArray(profile.closedDates) && profile.closedDates.length) {
    add('profile.closedDates', 'closed on', profile.closedDates.join(', '))
  }
  return lines
}

function itemLine(item) {
  const also = Array.isArray(item.variations) && item.variations.length
    ? ` | also asked: ${item.variations.map(oneLine).join('; ')}`
    : ''
  return {
    id: item._id,
    text: `[${item._id}] ${item.topic}: Q: ${oneLine(item.question)} | A: ${oneLine(item.answer)}${also}`
  }
}

const topicRank = topic => {
  const i = KNOWLEDGE_TOPICS.indexOf(topic)
  return i === -1 ? KNOWLEDGE_TOPICS.length : i
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} businessId
 * @returns {Promise<{ text: string, factIds: string[] }>}
 */
async function publicFacts(db, businessId) {
  const profile = await db.collection('frontDeskProfiles').findOne({ businessId, deletedAt: { $exists: false } })
  const items = await db.collection('knowledgeItems')
    .find({ businessId, status: 'approved', visibility: 'public', deletedAt: { $exists: false } })
    .toArray()
  items.sort((a, b) =>
    topicRank(a.topic) - topicRank(b.topic)
    || (a.createdAt ?? 0) - (b.createdAt ?? 0)
    || String(a._id).localeCompare(String(b._id)))

  const lines = [...profileLines(profile), ...items.map(itemLine)]
  const kept = []
  let length = 0
  for (const line of lines) {
    const next = length + (kept.length ? 1 : 0) + line.text.length
    if (next > MAX_FACTS_CHARS) break
    kept.push(line)
    length = next
  }
  return {
    text: kept.map(l => l.text).join('\n'),
    factIds: kept.map(l => l.text.slice(1, l.text.indexOf(']')))
  }
}

module.exports = { publicFacts, MAX_FACTS_CHARS }
