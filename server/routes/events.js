'use strict'
/**
 * Plan 442 (contract C-STAGES): the one door for an event's stage moves and notes.
 * Stage history, `closedAt` and notes are written only here, with the actor taken from the token, so a
 * client can never rewrite them (the generic data API strips them). Plan 446 adds closing / finish / reopen.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan, can } = require('../utils/permissions')
const { isEventVisible, visibleStagesFor } = require('../utils/event-visibility')
const { applyStageChange, newNote } = require('../utils/event-stage')
const {
  CLOSING_STAGES, initClosing, applySnapshotOnStage, refreshedSnapshot, syncClosingPlanned, diffClosing, mergeClosing, arrivalOnly, finishPatch,
} = require('../utils/closing-rules')
const { newId } = require('../utils/id')
const { LIVE } = require('../jobs/purge-deleted')

const TYPE = 'menuEvents'
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }
const router = Router()

// Same write budget as the data router: the one shared limiter instance (server/middleware/write-limit.js).
router.use(dataWriteLimiter)

const events = () => mongoose.connection.db.collection(TYPE)
const actorOf = req => ({ userId: req.user.userId, name: req.user.name ?? '' })
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req), ...LIVE })

/** Loads the caller's event or sends 404. Plan 477: an event in a stage hidden from this staff member is "not found" too. */
async function loadEvent(req, res) {
  const found = await events().findOne(scopeOf(req))
  const event = found && isEventVisible(await visibleStagesFor(req), req.user.userId, found) ? found : null
  if (!event) res.status(404).json({ error: 'Event not found' })
  return event
}

/** Zod check of the document as it will be stored; sends the 400 and returns false when invalid. */
function validMerged(res, merged) {
  const check = checkStoredDoc(TYPE, merged)
  if (check.ok) return true
  res.status(400).json({ error: 'Validation failed', issues: check.issues })
  return false
}

function fail(req, res, name, err) {
  req.log.error({ err, event: `events.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

// PUT /api/v1/events/:id/stage  { stage, reason?, reasonText?, planSnapshot? }
router.put('/:id/stage', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (!assertCan(req, res, 'changeStage', { type: TYPE, doc: event })) return
    const now = Date.now()
    const change = applyStageChange(event, req.body ?? {}, actorOf(req), now)
    if (!change.ok) return res.status(change.status).json({ error: change.error })
    if (!change.push) return res.json(event)

    // Plan 446: the planning snapshot is stored / frozen by the stage it enters (same rule as the client's).
    const snapshot = applySnapshotOnStage(event, change.set.stage, req.body?.planSnapshot, now)
    if (snapshot) change.set.planSnapshot = snapshot
    const merged = { ...event, ...change.set, updatedAt: now, stageHistory: [...(event.stageHistory ?? []), change.push] }
    if (!validMerged(res, merged)) return
    // Conditional on the stage that was read, so two concurrent moves cannot both write (closedAt stays the first one).
    const result = await events().findOneAndUpdate(
      { ...scopeOf(req), stage: event.stage ?? { $exists: false } },
      { $set: { ...change.set, updatedAt: now }, $push: { stageHistory: change.push } },
      { returnDocument: 'after' },
    )
    if (!result) {
      const still = await events().findOne(scopeOf(req), { projection: { _id: 1 } })
      return still ? res.status(409).json({ error: 'STAGE_CHANGED' }) : res.status(404).json({ error: 'Event not found' })
    }
    req.log.info({ event: 'events.stage.changed', from: event.stage ?? 'inquiry', to: change.set.stage })
    res.json(result)
  } catch (err) {
    fail(req, res, 'stage', err)
  }
})

// POST /api/v1/events/:id/notes  { text }
router.post('/:id/notes', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (!assertCan(req, res, 'addNote', { type: TYPE, doc: event })) return
    const now = Date.now()
    const made = newNote(req.body?.text, actorOf(req), now, newId())
    if (!made.ok) return res.status(made.status).json({ error: made.error })
    if (!validMerged(res, { ...event, notes: [...(event.notes ?? []), made.note] })) return
    const result = await events().findOneAndUpdate(
      scopeOf(req),
      { $push: { notes: made.note }, $set: { updatedAt: now } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(404).json({ error: 'Event not found' })
    req.log.info({ event: 'events.note.added' })
    res.status(201).json(result)
  } catch (err) {
    fail(req, res, 'note.add', err)
  }
})

/** Loads the event and the note; sends 404 / 403 and returns null unless the caller is the note's author. */
async function loadOwnNote(req, res, action) {
  const event = await loadEvent(req, res)
  if (!event) return null
  if (!assertCan(req, res, action, { type: TYPE, doc: event })) return null
  const note = (event.notes ?? []).find(n => n._id === req.params.noteId)
  if (!note) {
    res.status(404).json({ error: 'Note not found' })
    return null
  }
  if (note.by !== req.user.userId) {
    res.status(403).json(FORBIDDEN)
    return null
  }
  return { event, note }
}

// PUT /api/v1/events/:id/notes/:noteId  { text }  (author only)
router.put('/:id/notes/:noteId', verifyToken, async (req, res) => {
  try {
    const found = await loadOwnNote(req, res, 'addNote')
    if (!found) return
    const now = Date.now()
    const made = newNote(req.body?.text, actorOf(req), now, found.note._id)
    if (!made.ok) return res.status(made.status).json({ error: made.error })
    const edited = { ...found.note, text: made.note.text, editedAt: now }
    const notes = found.event.notes.map(n => (n._id === edited._id ? edited : n))
    if (!validMerged(res, { ...found.event, notes })) return
    const result = await events().findOneAndUpdate(
      scopeOf(req),
      { $set: { 'notes.$[n].text': edited.text, 'notes.$[n].editedAt': now, updatedAt: now } },
      { arrayFilters: [{ 'n._id': req.params.noteId, 'n.by': req.user.userId }], returnDocument: 'after' },
    )
    if (!result) return res.status(404).json({ error: 'Event not found' })
    req.log.info({ event: 'events.note.edited' })
    res.json(result)
  } catch (err) {
    fail(req, res, 'note.edit', err)
  }
})

// DELETE /api/v1/events/:id/notes/:noteId  (author only)
router.delete('/:id/notes/:noteId', verifyToken, async (req, res) => {
  try {
    const found = await loadOwnNote(req, res, 'addNote')
    if (!found) return
    const result = await events().findOneAndUpdate(
      scopeOf(req),
      { $pull: { notes: { _id: req.params.noteId, by: req.user.userId } }, $set: { updatedAt: Date.now() } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(404).json({ error: 'Event not found' })
    req.log.info({ event: 'events.note.deleted' })
    res.json(result)
  } catch (err) {
    fail(req, res, 'note.delete', err)
  }
})

const finishedLocked = res => res.status(409).json({ error: 'EVENT_FINISHED', messageKey: 'event_finished_locked' })

/** Writes `$set` / `$unset` / `$push` on an event read at `stage`; sends the result, 404 or the 409 of a concurrent move. */
async function writeConditional(req, res, event, update, logEvent, status = 200) {
  const result = await events().findOneAndUpdate(
    { ...scopeOf(req), stage: event.stage ?? { $exists: false } },
    update,
    { returnDocument: 'after' },
  )
  if (!result) {
    const still = await events().findOne(scopeOf(req), { projection: { _id: 1 } })
    return still ? res.status(409).json({ error: 'STAGE_CHANGED' }) : res.status(404).json({ error: 'Event not found' })
  }
  req.log.info({ event: logEvent })
  return res.status(status).json(result)
}

// PUT /api/v1/events/:id/closing  { closing }  amounts: owner (editMoney); arrived, invoice, photos: staff too (markArrival).
// Plan 488: a caller without editMoney whose (older) copy also carries a tick gets an arrival-only merge — the stored
// money and row set are kept, only the ticks and photos of shared rows are taken — instead of a 403 that drops the tick.
router.put('/:id/closing', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (event.stage === 'finished') return finishedLocked(res)
    const incoming = req.body?.closing
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'BAD_CLOSING' })
    const base = event.closing ?? (event.planSnapshot ? initClosing(event.planSnapshot) : null)
    if (!base) return res.status(400).json({ error: 'NO_PLAN' })
    const diff = diffClosing(base, incoming)
    if (!diff.ok) return res.status(400).json({ error: diff.error })
    const ctx = { type: TYPE, doc: event }
    const arrivalOnlyWrite = diff.money && diff.arrival && !can(req.user, 'editMoney', ctx).ok
    if (diff.money && !arrivalOnlyWrite && !assertCan(req, res, 'editMoney', ctx)) return
    if (diff.arrival && !assertCan(req, res, 'markArrival', ctx)) return
    if (arrivalOnlyWrite) req.log.warn({ event: 'events.closing.money_ignored', eventId: event._id })
    const now = Date.now()
    const closing = arrivalOnlyWrite ? arrivalOnly(base, incoming) : mergeClosing(base, incoming)
    if (!validMerged(res, { ...event, closing })) return
    await writeConditional(req, res, event, { $set: { closing, updatedAt: now } }, 'events.closing.saved')
  } catch (err) {
    fail(req, res, 'closing', err)
  }
})

// POST /api/v1/events/:id/finish  (owner, from "ביצוע" or "פוסט-פרודקשן")
router.post('/:id/finish', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (!assertCan(req, res, 'editMoney', { type: TYPE, doc: event })) return
    if (event.stage === 'finished') return finishedLocked(res)
    if (!CLOSING_STAGES.includes(event.stage)) return res.status(400).json({ error: 'FINISH_FROM_STAGE' })
    const now = Date.now()
    const { set, push } = finishPatch(event, actorOf(req), now)
    const merged = { ...event, ...set, updatedAt: now, stageHistory: [...(event.stageHistory ?? []), push] }
    if (!validMerged(res, merged)) return
    await writeConditional(
      req, res, event, { $set: { ...set, updatedAt: now }, $push: { stageHistory: push } }, 'events.finished',
    )
  } catch (err) {
    fail(req, res, 'finish', err)
  }
})

// POST /api/v1/events/:id/reopen  (owner, only a finished event)
router.post('/:id/reopen', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (!assertCan(req, res, 'editMoney', { type: TYPE, doc: event })) return
    if (event.stage !== 'finished') return res.status(400).json({ error: 'REOPEN_FROM_STAGE' })
    const now = Date.now()
    const actor = actorOf(req)
    const push = { stage: 'post_production', at: now, by: actor.userId, byName: actor.name }
    const { finishedAt: _a, finishedBy: _b, ...closing } = event.closing ?? {}
    const merged = { ...event, stage: 'post_production', closing, updatedAt: now, stageHistory: [...(event.stageHistory ?? []), push] }
    if (!event.closing) delete merged.closing
    if (!validMerged(res, merged)) return
    await writeConditional(
      req, res, event,
      {
        $set: { stage: 'post_production', updatedAt: now },
        $unset: { 'closing.finishedAt': '', 'closing.finishedBy': '' },
        $push: { stageHistory: push },
      },
      'events.reopened',
    )
  } catch (err) {
    fail(req, res, 'reopen', err)
  }
})

// POST /api/v1/events/:id/refresh-plan  { planSnapshot }  (owner): replaces the snapshot, `frozenAt` kept
router.post('/:id/refresh-plan', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (!assertCan(req, res, 'editMoney', { type: TYPE, doc: event })) return
    if (event.stage === 'finished') return finishedLocked(res)
    const incoming = req.body?.planSnapshot
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error: 'BAD_SNAPSHOT' })
    const now = Date.now()
    const planSnapshot = refreshedSnapshot(event, incoming, now)
    const set = { planSnapshot, updatedAt: now }
    if (event.closing) set.closing = syncClosingPlanned(event.closing, planSnapshot)
    if (!validMerged(res, { ...event, ...set })) return
    await writeConditional(req, res, event, { $set: set }, 'events.plan.refreshed')
  } catch (err) {
    fail(req, res, 'refresh', err)
  }
})

module.exports = router
