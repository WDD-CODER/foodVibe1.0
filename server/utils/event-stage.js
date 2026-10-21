'use strict'
/**
 * Plan 442 (contract C-STAGES): the pure rules for moving an event between pipeline stages and for notes.
 * `routes/events.js` is the only caller; nothing here touches the database.
 */

const {
  EVENT_STAGES, NOT_CLOSED_REASONS, NOT_CLOSED_FROM, CLOSED_FROM_INDEX, NOTE_MAX_LENGTH,
} = require('../generated/schemas/entities/event-stage')

const fail = (status, error) => ({ ok: false, status, error })

/**
 * Decides a stage move.
 * @param {{ stage?: string, eventDate?: string, closedAt?: number }} event the stored event
 * @param {{ stage: string, reason?: string, reasonText?: string }} change
 * @param {{ userId: string, name: string }} actor
 * @param {number} now
 * @returns {{ ok: true, set: object, push: object | null } | { ok: false, status: number, error: string }}
 */
function applyStageChange(event, change, actor, now) {
  const target = change?.stage
  if (!EVENT_STAGES.includes(target)) return fail(400, 'BAD_STAGE')
  const current = event.stage ?? 'inquiry'
  if (current === 'finished') return fail(409, 'EVENT_FINISHED')
  if (target === 'finished') return fail(400, 'USE_FINISH')
  if (target === current) return { ok: true, set: {}, push: null }

  const isNotClosed = target === 'not_closed'
  if (isNotClosed && !NOT_CLOSED_FROM.includes(current)) return fail(400, 'NOT_CLOSED_FROM_STAGE')
  if (isNotClosed && !NOT_CLOSED_REASONS.includes(change.reason)) return fail(400, 'REASON_REQUIRED')
  const closes = !isNotClosed && EVENT_STAGES.indexOf(target) >= CLOSED_FROM_INDEX
  if (closes && !event.eventDate) return fail(400, 'DATE_REQUIRED')

  const reasonText = typeof change.reasonText === 'string' ? change.reasonText.trim().slice(0, NOTE_MAX_LENGTH) : ''
  const set = { stage: target }
  if (closes && event.closedAt === undefined) set.closedAt = now
  if (isNotClosed) {
    set.notClosedAt = now
    set.notClosedReason = change.reason
    if (reasonText) set.notClosedText = reasonText
  }
  const push = { stage: target, at: now, by: actor.userId, byName: actor.name }
  if (isNotClosed) {
    push.reason = change.reason
    if (reasonText) push.reasonText = reasonText
  }
  return { ok: true, set, push }
}

/** Builds a note from raw text (trimmed). */
function newNote(text, actor, now, id) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return fail(400, 'NOTE_EMPTY')
  if (trimmed.length > NOTE_MAX_LENGTH) return fail(400, 'NOTE_TOO_LONG')
  return { ok: true, note: { _id: id, text: trimmed, at: now, by: actor.userId, byName: actor.name } }
}

module.exports = { applyStageChange, newNote }
