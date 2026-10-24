'use strict'
/**
 * Plan 446 (contract C-SNAPSHOT): the pure rules for the planning snapshot and the event closing.
 * `routes/events.js` is the only caller; nothing here touches the database.
 */
const { snapshotActionOnStage, EVENT_STAGES, CLOSED_FROM_INDEX } = require('../generated/schemas/entities/event-stage')

const ROW_NONE = '__none__'
const rowKey = row => row.supplierId ?? ROW_NONE
const isEmpty = value => value === undefined || value === null

/** Stages in which the closing dialog works: from "ביצוע" to "פוסט-פרודקשן". */
const CLOSING_STAGES = ['execution', 'post_production']

/** A fresh closing from a snapshot: one row per snapshot supplier, nothing typed yet. */
function initClosing(snapshot) {
  return {
    suppliers: (snapshot?.suppliers ?? []).map(s => ({
      supplierId: s.supplierId ?? null,
      name: s.name,
      planned: s.plannedCost,
      arrived: false,
      hasInvoice: false,
      photos: [],
    })),
  }
}

/** `snapshot` without a client-set `frozenAt` (only the server freezes). */
const withoutFrozen = snapshot => {
  const { frozenAt: _ignored, ...rest } = snapshot
  return rest
}

/**
 * What the stored `planSnapshot` becomes when the event enters `nextStage`.
 * @returns {object | null} the snapshot to store, or null to leave it as it is
 */
function applySnapshotOnStage(stored, nextStage, incoming, now) {
  const action = snapshotActionOnStage(nextStage, stored?.planSnapshot)
  if (action === 'none') return null
  const base = incoming && typeof incoming === 'object' ? withoutFrozen(incoming) : stored?.planSnapshot
  if (!base) return null
  return action === 'store' ? base : { ...base, frozenAt: now }
}

/** The snapshot to store for a refresh: replaced content, `frozenAt` kept (set now when the event is already past "הזמנות"). */
function refreshedSnapshot(stored, incoming, now) {
  const base = withoutFrozen(incoming)
  const frozenAt = stored.planSnapshot?.frozenAt ?? (CLOSING_STAGES.includes(stored.stage) ? now : undefined)
  return frozenAt === undefined ? base : { ...base, frozenAt }
}

/** Brings the closing rows' planned amounts in line with a refreshed snapshot; typed values stay. */
function syncClosingPlanned(closing, snapshot) {
  const plannedBy = new Map(snapshot.suppliers.map(s => [s.supplierId ?? ROW_NONE, s]))
  const rows = closing.suppliers.map(row => {
    const hit = plannedBy.get(rowKey(row))
    return hit ? { ...row, planned: hit.plannedCost } : row
  })
  const have = new Set(rows.map(rowKey))
  for (const s of snapshot.suppliers) {
    if (!have.has(s.supplierId ?? ROW_NONE)) rows.push(initClosing({ suppliers: [s] }).suppliers[0])
  }
  return { ...closing, suppliers: rows }
}

/**
 * What an incoming closing changes against the stored one.
 * `money`: an amount, a row added or removed, a row's planned amount or name; `arrival`: arrived, invoice, photos.
 * @returns {{ ok: true, money: boolean, arrival: boolean } | { ok: false, error: string }}
 */
function diffClosing(stored, incoming) {
  const rows = incoming?.suppliers
  if (!Array.isArray(rows)) return { ok: false, error: 'BAD_CLOSING' }
  const keys = rows.map(rowKey)
  if (new Set(keys).size !== keys.length) return { ok: false, error: 'DUPLICATE_SUPPLIER' }

  const before = new Map(stored.suppliers.map(r => [rowKey(r), r]))
  let money = keys.length !== before.size || keys.some(k => !before.has(k))
  let arrival = false
  for (const row of rows) {
    const old = before.get(rowKey(row))
    if (!old) continue
    if (row.planned !== old.planned || row.name !== old.name || (row.actualPaid ?? null) !== (old.actualPaid ?? null)) money = true
    if (row.arrived !== old.arrived || row.hasInvoice !== old.hasInvoice) arrival = true
    if (JSON.stringify(row.photos ?? []) !== JSON.stringify(old.photos ?? [])) arrival = true
  }
  for (const field of ['actualExtraCosts', 'actualRevenue']) {
    if ((incoming[field] ?? null) !== (stored[field] ?? null)) money = true
  }
  return { ok: true, money, arrival }
}

/** The closing to store: the client's content, with the server-owned finish stamps kept from the stored one. */
function mergeClosing(stored, incoming) {
  const { finishedAt: _a, finishedBy: _b, ...content } = incoming
  const keep = {}
  if (!isEmpty(stored.finishedAt)) keep.finishedAt = stored.finishedAt
  if (!isEmpty(stored.finishedBy)) keep.finishedBy = stored.finishedBy
  return { ...content, ...keep }
}

/** The most delivery-note photos one row keeps (same cap as the menu-event schema). */
const MAX_ROW_PHOTOS = 10

/**
 * Plan 488: the closing to store for a caller who may not change money, whose copy is older than the stored one.
 * The stored closing is kept whole (amounts, totals, row set, names, planned, finish stamps). From the incoming copy
 * only additions are taken, on rows present in both: a tick (`arrived` / `hasInvoice` true) and photos the stored row
 * does not have yet. Nothing stored is ever cleared here — an old copy cannot tell "the cook unticked" from "someone
 * ticked since", so an untick or photo removal on this path waits for the next save on the fresh copy the route
 * returns. Rows only in the incoming copy are ignored, rows only in the stored one stay.
 */
function arrivalOnly(stored, incoming) {
  const from = new Map((incoming?.suppliers ?? []).map(r => [rowKey(r), r]))
  const suppliers = stored.suppliers.map(row => {
    const hit = from.get(rowKey(row))
    if (!hit) return row
    const have = row.photos ?? []
    const added = (Array.isArray(hit.photos) ? hit.photos : []).filter(p => !have.includes(p))
    return {
      ...row,
      arrived: row.arrived === true || hit.arrived === true,
      hasInvoice: row.hasInvoice === true || hit.hasInvoice === true,
      photos: [...have, ...added].slice(0, Math.max(have.length, MAX_ROW_PHOTOS)),
    }
  })
  return { ...stored, suppliers }
}

/**
 * The update that finishes an event: stage, history entry, finish stamps, and `closedAt` when it was never set.
 * @returns {{ set: object, push: object }}
 */
function finishPatch(event, actor, now) {
  const closing = { ...(event.closing ?? initClosing(event.planSnapshot)), finishedAt: now, finishedBy: actor.userId }
  const set = { stage: 'finished', closing }
  if (event.closedAt === undefined) set.closedAt = now
  return { set, push: { stage: 'finished', at: now, by: actor.userId, byName: actor.name } }
}

/**
 * Plan 493: why an event may not be finished now (the owner finishes from any live stage), or null.
 * `FINISH_FROM_STAGE`: a lost deal ("לא נסגר") is brought back to a live stage first; `DATE_REQUIRED`: before
 * "מקדמה שולמה" the event needs a date, the same rule as any move that closes the deal.
 * @returns {'FINISH_FROM_STAGE' | 'DATE_REQUIRED' | null}
 */
function finishRefusal(event) {
  const stage = event.stage ?? 'inquiry'
  if (stage === 'not_closed') return 'FINISH_FROM_STAGE'
  if (EVENT_STAGES.indexOf(stage) < CLOSED_FROM_INDEX && !event.eventDate) return 'DATE_REQUIRED'
  return null
}

module.exports = {
  CLOSING_STAGES, finishRefusal, initClosing, applySnapshotOnStage, refreshedSnapshot, syncClosingPlanned, diffClosing, mergeClosing, arrivalOnly, finishPatch,
}
