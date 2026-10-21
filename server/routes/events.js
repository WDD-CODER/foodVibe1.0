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
const { assertCan } = require('../utils/permissions')
const { applyStageChange, newNote } = require('../utils/event-stage')
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

/** Loads the caller's event or sends 404. */
async function loadEvent(req, res) {
  const event = await events().findOne(scopeOf(req))
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

// PUT /api/v1/events/:id/stage  { stage, reason?, reasonText? }
router.put('/:id/stage', verifyToken, async (req, res) => {
  try {
    const event = await loadEvent(req, res)
    if (!event) return
    if (!assertCan(req, res, 'changeStage', { type: TYPE, doc: event })) return
    const now = Date.now()
    const change = applyStageChange(event, req.body ?? {}, actorOf(req), now)
    if (!change.ok) return res.status(change.status).json({ error: change.error })
    if (!change.push) return res.json(event)

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

module.exports = router
