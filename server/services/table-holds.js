'use strict'
/**
 * Plan 668 (C-HOLD): the table holds. One row per table per 15-minute cell in `tableHolds`; the unique index
 * `{ businessId, tableKey, cell }` is the only guard against a double booking (INV-7). Nothing here reads the rows
 * and then trusts what it read: a claim inserts, and a duplicate-key error means the table is taken.
 */
const { newId } = require('../utils/id')

const COLLECTION = 'tableHolds'
const CELL_MS = 15 * 60000

/** The cell epochs that overlap `[startAt, endAtWithBuffer)`. */
function cellsOf(startAt, endAtWithBuffer) {
  const cells = []
  for (let cell = Math.floor(startAt / CELL_MS) * CELL_MS; cell < endAtWithBuffer; cell += CELL_MS) cells.push(cell)
  return cells
}

const isDuplicate = err => err?.code === 11000 || err?.writeErrors?.[0]?.code === 11000 || err?.writeErrors?.[0]?.err?.code === 11000

/** Inserts `rows` in order; on any error removes what this call inserted. `{ ok }` or a rethrow. */
async function insertRows(db, businessId, bookingId, rows) {
  if (!rows.length) return { ok: true }
  try {
    await db.collection(COLLECTION).insertMany(rows, { ordered: true })
    return { ok: true }
  } catch (err) {
    await db.collection(COLLECTION).deleteMany({ businessId, bookingId, _id: { $in: rows.map(r => r._id) } })
    if (isDuplicate(err)) return { ok: false }
    throw err
  }
}

const rowOf = (booking, tableKey, cell) => ({
  _id: newId(),
  businessId: booking.businessId,
  tableKey,
  cell,
  bookingId: booking._id,
  ...(booking.test && { test: true }),
})

/** `booking` is `{ _id, businessId, test? }`. Takes every cell of every table, or none: `{ ok }`. */
async function claim(db, booking, tableKeys, startAt, endAtWithBuffer) {
  const cells = cellsOf(startAt, endAtWithBuffer)
  const rows = tableKeys.flatMap(tableKey => cells.map(cell => rowOf(booking, tableKey, cell)))
  return insertRows(db, booking.businessId, booking._id, rows)
}

/**
 * Moves a booking's holds: inserts the (table, cell) pairs it does not hold yet, and only after that succeeded
 * deletes the rows it no longer needs. A failure leaves the old rows as they were.
 */
async function move(db, booking, tableKeys, startAt, endAtWithBuffer) {
  const { businessId } = booking
  const own = await db.collection(COLLECTION).find({ businessId, bookingId: booking._id }).toArray()
  const held = new Set(own.map(r => `${r.tableKey}|${r.cell}`))
  const cells = cellsOf(startAt, endAtWithBuffer)
  const wanted = new Set(tableKeys.flatMap(k => cells.map(c => `${k}|${c}`)))
  const rows = tableKeys.flatMap(k => cells.filter(c => !held.has(`${k}|${c}`)).map(c => rowOf(booking, k, c)))
  const res = await insertRows(db, businessId, booking._id, rows)
  if (!res.ok) return res
  const stale = own.filter(r => !wanted.has(`${r.tableKey}|${r.cell}`)).map(r => r._id)
  if (stale.length) await db.collection(COLLECTION).deleteMany({ businessId, bookingId: booking._id, _id: { $in: stale } })
  return { ok: true }
}

/** Deletes the booking's rows, from a moment on when `fromEpoch` is given. */
async function release(db, businessId, bookingId, fromEpoch) {
  const filter = { businessId, bookingId }
  if (fromEpoch !== undefined) filter.cell = { $gte: Math.floor(fromEpoch / CELL_MS) * CELL_MS }
  await db.collection(COLLECTION).deleteMany(filter)
}

/** One engine `Hold` per row inside the range; `exceptBookingId` leaves a booking's own rows out. */
async function holdsOf(db, businessId, fromEpoch, toEpoch, exceptBookingId) {
  const filter = { businessId, cell: { $gte: fromEpoch - CELL_MS, $lt: toEpoch } }
  if (exceptBookingId !== undefined) filter.bookingId = { $ne: exceptBookingId }
  const rows = await db.collection(COLLECTION).find(filter).toArray()
  return rows.map(r => ({ tableKey: r.tableKey, startAt: r.cell, endAt: r.cell + CELL_MS }))
}

/** The raw rows of a range (for `rangesOf`). */
async function rowsOf(db, businessId, fromEpoch, toEpoch) {
  return db.collection(COLLECTION).find({ businessId, cell: { $gte: fromEpoch - CELL_MS, $lt: toEpoch } }).toArray()
}

/** Touching cells of one booking on one table merged: `[{ tableKey, bookingId, startAt, endAt }]`. */
function rangesOf(rows) {
  const sorted = [...rows].sort((a, b) =>
    (a.bookingId < b.bookingId ? -1 : a.bookingId > b.bookingId ? 1 : 0) ||
    (a.tableKey < b.tableKey ? -1 : a.tableKey > b.tableKey ? 1 : 0) || a.cell - b.cell)
  const out = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && last.bookingId === r.bookingId && last.tableKey === r.tableKey && last.endAt === r.cell) last.endAt = r.cell + CELL_MS
    else out.push({ tableKey: r.tableKey, bookingId: r.bookingId, startAt: r.cell, endAt: r.cell + CELL_MS })
  }
  return out.sort((a, b) => a.startAt - b.startAt)
}

module.exports = { CELL_MS, cellsOf, claim, move, release, holdsOf, rowsOf, rangesOf }
