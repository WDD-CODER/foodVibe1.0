'use strict'
/**
 * Plan 555 (C-PUBLIC): the one place that decides which profile fields a stranger may see.
 * Never exposed: businessId, whatsapp, assistant, status, minBudgetPerGuest, areas, any _id.
 */
const { LIVE } = require('../jobs/purge-deleted')

const PUBLIC_STATUSES = ['pilot', 'active']
const PUBLIC_RULES = ['minPartySize', 'maxPartySize', 'minLeadHours', 'maxLeadDays']

/** The live profile whose slug matches (lower-case), or null. */
async function loadPublicProfile(db, slug) {
  if (typeof slug !== 'string' || !slug) return null
  return db.collection('frontDeskProfiles').findOne({ slug: slug.toLowerCase(), ...LIVE })
}

const isPublic = profile => PUBLIC_STATUSES.includes(profile?.status)

/** The profile a stranger may read. `{ available: true, ... }`. */
function publicView(profile) {
  const kinds = Object.entries(profile.requestKinds ?? {})
    .filter(([, cfg]) => cfg?.enabled)
    .map(([kind, cfg]) => ({
      kind,
      questions: (cfg.questions ?? []).map(q => ({
        key: q.key, label: q.label, type: q.type, required: q.required, ...(q.options && { options: q.options }),
      })),
      rules: Object.fromEntries(PUBLIC_RULES.filter(k => cfg.rules?.[k] !== undefined).map(k => [k, cfg.rules[k]])),
      ...(cfg.defaultDurationMinutes !== undefined && { durationMinutes: cfg.defaultDurationMinutes }),
    }))
  return {
    available: true,
    displayName: profile.displayName,
    ...(profile.logoUrl && { logoUrl: profile.logoUrl }),
    ...(profile.phone && { phone: profile.phone }),
    ...(profile.address && { address: profile.address }),
    ...(profile.serviceArea && { serviceArea: profile.serviceArea }),
    hours: profile.hours ?? [],
    ...(profile.closedDates && { closedDates: profile.closedDates }),
    kinds,
  }
}

module.exports = { loadPublicProfile, isPublic, publicView }
