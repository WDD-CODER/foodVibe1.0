'use strict'
/**
 * Plan 618 (contract C-AIDRAFT): the draft trail — what the model suggested next to what the person saved.
 * The only writer of the server-only `aiDrafts` collection. Nothing but a draft's `_id` leaves the server.
 * `saveAiDraft` never throws (a failed trail never stops the AI action); `confirmAiDraft` lets a database error
 * reach the calling route, which decides.
 */

const mongoose = require('mongoose')
const { newId } = require('../utils/id')
const { actorOf } = require('../utils/actor')
const { isAiFeature } = require('../constants/ai-features')
const { aiDraftSchema } = require('../generated/schemas/entities')

/** At most this many drafts are kept per business and feature (the newest). */
const AI_DRAFT_KEEP = 500
/** `input.text` longer than this is cut to this length. */
const AI_DRAFT_TEXT_MAX = 20000
/** A draft or a saved result longer than this (characters of JSON) is not stored. */
const AI_DRAFT_JSON_MAX = 200000
const MODEL_MAX = 80

const col = () => mongoose.connection.db.collection('aiDrafts')

/** Length of `value` as JSON, or Infinity when it cannot be serialised. */
function jsonLength(value) {
  try {
    const json = JSON.stringify(value)
    return typeof json === 'string' ? json.length : Infinity
  } catch {
    return Infinity
  }
}

function warn(req, payload) {
  try { req?.log?.warn(payload) } catch { /* logging never breaks the feature */ }
}

/** Deletes the drafts of one business and feature beyond the newest AI_DRAFT_KEEP. Errors are swallowed. */
async function prune(businessId, feature) {
  try {
    const old = await col().find({ businessId, feature }).sort({ at: -1, _id: -1 }).skip(AI_DRAFT_KEEP).project({ _id: 1 }).toArray()
    if (old.length) await col().deleteMany({ _id: { $in: old.map(d => d._id) } })
  } catch { /* the draft is stored; pruning retries on the next save */ }
}

/**
 * Stores one AI draft for the caller's business. Returns the draft id, or null (stores nothing) when the feature is
 * unknown, the caller has no business, the draft is too large, the document fails the schema or the insert fails.
 */
async function saveAiDraft(req, { feature, subject, input, aiDraft, model } = {}) {
  const fail = reason => { warn(req, { event: 'ai.draft.save_failed', feature: isAiFeature(feature) ? feature : undefined, reason }); return null }
  try {
    if (!isAiFeature(feature)) return fail('feature')
    const businessId = req?.user?.businessId
    if (!businessId) return fail('no_business')
    if (jsonLength(aiDraft) > AI_DRAFT_JSON_MAX) return fail('too_large')
    const storedInput = {}
    if (typeof input?.text === 'string') storedInput.text = input.text.slice(0, AI_DRAFT_TEXT_MAX)
    else if (input?.text !== undefined) storedInput.text = input.text
    if (input?.fileId !== undefined) storedInput.fileId = input.fileId
    const doc = {
      _id: newId(),
      businessId,
      userId: actorOf(req).userId,
      feature,
      input: storedInput,
      aiDraft,
      status: 'pending',
      at: Date.now()
    }
    if (subject && typeof subject === 'object') {
      doc.subject = { type: subject.type }
      if (subject.id !== undefined) doc.subject.id = subject.id
    } else if (subject !== undefined) {
      doc.subject = subject // not an object: the schema check refuses it
    }
    if (typeof model === 'string' && model.length > 0 && model.length <= MODEL_MAX) doc.model = model
    const parsed = aiDraftSchema.safeParse(doc)
    if (!parsed.success) return fail('schema')
    try {
      await col().insertOne(parsed.data)
    } catch {
      return fail('db')
    }
    await prune(businessId, feature)
    return doc._id
  } catch {
    return fail('db')
  }
}

/**
 * Confirms one pending draft of the caller's business with what was saved and its closeness score.
 * Returns `{ draftId, keptRatio }`, or null for an unknown id, another business's draft or one already confirmed.
 * `ratio(aiDraft, saved)` is the feature's pure closeness function (0–1).
 */
async function confirmAiDraft(req, draftId, saved, ratio) {
  const businessId = req?.user?.businessId
  if (!businessId || draftId === undefined || draftId === null) return null
  const filter = { _id: String(draftId), businessId, status: 'pending' }
  const stored = await col().findOne(filter, { projection: { aiDraft: 1, feature: 1 } })
  if (!stored) return null
  let keptRatio
  try {
    const value = ratio(stored.aiDraft, saved)
    if (typeof value === 'number' && Number.isFinite(value)) keptRatio = Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
  } catch { /* logged below */ }
  if (keptRatio === undefined) warn(req, { event: 'ai.draft.ratio_failed', feature: stored.feature })
  const $set = { status: 'confirmed', confirmedAt: Date.now() }
  if (saved !== undefined && jsonLength(saved) <= AI_DRAFT_JSON_MAX) $set.saved = saved
  if (keptRatio !== undefined) $set.keptRatio = keptRatio
  const result = await col().updateOne(filter, { $set })
  if (!result.matchedCount) return null
  req.log?.info({ event: 'ai.draft.confirmed', feature: stored.feature, keptRatio })
  return { draftId: stored._id, keptRatio }
}

module.exports = { saveAiDraft, confirmAiDraft, AI_DRAFT_KEEP, AI_DRAFT_TEXT_MAX, AI_DRAFT_JSON_MAX }
