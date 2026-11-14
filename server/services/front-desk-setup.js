'use strict'
/**
 * Plan 556: what a business still has to do before its front desk can go live. One function, used by
 * `GET /business/setup-status` and by the platform admin's business rows. Never lists a baseline item (D15).
 */
const { LIVE } = require('../jobs/purge-deleted')

/** Knowledge topics that must have an approved item, per business type (restaurant hours and location come from the profile). */
const REQUIRED_TOPICS = {
  restaurant: ['hours', 'location', 'menu', 'policy'],
  private_chef: ['prices', 'events', 'dietary', 'policy'],
  catering: ['events', 'prices', 'policy'],
  other: ['policy'],
}
/** One constant to change after the pilot. */
const MIN_APPROVED_PER_TOPIC = 1

const filled = v => typeof v === 'string' && v.trim().length > 0

function basicsDone(p) {
  return filled(p.displayName) && filled(p.slug) && filled(p.phone) && (filled(p.address) || filled(p.serviceArea))
}

function kindsDone(p) {
  const enabled = Object.values(p.requestKinds ?? {}).filter(k => k?.enabled)
  return enabled.length > 0 && enabled.every(k => (k.questions ?? []).length > 0)
}

/** The checklist of one loaded profile. */
async function checklistFor(db, businessId, profile) {
  const topics = REQUIRED_TOPICS[profile.businessType] ?? []
  const approved = await db.collection('knowledgeItems').aggregate([
    { $match: { businessId, status: 'approved', ...LIVE } },
    { $group: { _id: '$topic', n: { $sum: 1 } } },
  ]).toArray()
  const byTopic = new Map(approved.map(r => [r._id, r.n]))
  const testApproved = await db.collection('requests').findOne(
    { businessId, test: true, status: 'approved', ...LIVE },
    { projection: { _id: 1 } },
  )
  const hasHours = (profile.hours ?? []).length > 0
  const fromProfile = {
    hours: hasHours,
    location: filled(profile.address),
  }
  const items = [
    { key: 'profile_basics', done: basicsDone(profile) },
    { key: 'hours', done: hasHours },
    { key: 'request_kinds', done: kindsDone(profile) },
    ...topics.map(t => ({
      key: `knowledge_${t}`,
      done: profile.businessType === 'restaurant' && t in fromProfile
        ? t === 'location' ? fromProfile.location : fromProfile.hours
        : (byTopic.get(t) ?? 0) >= MIN_APPROVED_PER_TOPIC,
    })),
    { key: 'link_published', done: profile.status === 'pilot' || profile.status === 'active' },
    { key: 'test_request', done: !!testApproved },
  ]
  return { businessType: profile.businessType, items, done: items.filter(i => i.done).length, total: items.length }
}

const EMPTY = () => ({ businessType: null, items: [], done: 0, total: 0 })

/** `{ businessType, items: [{ key, done }], done, total }`; no profile gives the empty answer. */
async function frontDeskSetup(db, businessId, loadedProfile) {
  const profile = loadedProfile ?? await db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE })
  if (!profile) return EMPTY()
  return checklistFor(db, businessId, profile)
}

module.exports = { frontDeskSetup, REQUIRED_TOPICS, MIN_APPROVED_PER_TOPIC }
