'use strict'
/**
 * Plan 668 (C-HOLD, delta 4): the one code that turns an ask into a held table. `reserveTable` is assign -> claim;
 * `bookTable` is reserve -> write -> release on a failed write. Plans 685, 669, 673 and 680 call it; none calls
 * `claim` itself. The unique index of `tableHolds` is the only guard against a double booking (INV-7).
 */
const { LIVE } = require('../jobs/purge-deleted')
const { checkStoredDoc } = require('../middleware/validate')
const { newId } = require('../utils/id')
const { newPublicToken } = require('../utils/public-token')
const { upsertClientByPhone } = require('../utils/client-upsert')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { turnFor, candidates, assign, alternatives } = require('../generated/schemas/front-desk/table-engine')
const holds = require('./table-holds')

const WALK_IN_CLIENT_ID = '__walk_in__'
const TEST_CLIENT_ID = '__test__'
const MIN_MS = 60000
const HOUR_MS = 3600000
const DAY_MS = 86400000
const TRIES = 3
const ALT_DAYS = 15

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

/** The Jerusalem wall date and time of an epoch: `{ date: 'YYYY-MM-DD', time: 'HH:mm' }`. */
function wallOf(epoch) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(epoch)).filter(x => x.type !== 'literal').map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

/** The live profile, the live floor plan (or null) and the table settings of a business. */
async function loadTableContext(db, businessId) {
  const [profile, plan] = await Promise.all([
    db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE }),
    db.collection('floorPlans').findOne({ businessId, ...LIVE }),
  ])
  return { profile, plan: plan ?? null, service: tableServiceOf(profile) }
}

/** True when every key is an active table of the plan and no key repeats. */
function checkTables(plan, tableKeys) {
  if (!plan || !Array.isArray(tableKeys) || new Set(tableKeys).size !== tableKeys.length) return false
  const active = new Set(plan.tables.filter(t => t.active).map(t => t.key))
  return tableKeys.every(k => active.has(k))
}

/** True when the set is not one of the engine's candidates for the party (a member chose against the engine). */
function overrideOf(plan, partySize, tableKeys) {
  const sorted = [...tableKeys].sort().join('|')
  return !candidates(plan, partySize, undefined, false).some(c => [...c.tableKeys].sort().join('|') === sorted)
}

const areaOf = (plan, tableKeys) => plan?.tables.find(t => t.key === tableKeys[0])?.areaKey

/** The holds of `date` and the 14 days after it, grouped by Jerusalem date, for `alternatives`. */
async function holdsByDate(db, businessId, date, exceptBookingId) {
  const from = jerusalemEpoch(date, '00:00')
  const all = await holds.holdsOf(db, businessId, from - 6 * HOUR_MS, from + ALT_DAYS * DAY_MS + 6 * HOUR_MS, exceptBookingId)
  const out = {}
  for (let i = 0; i < ALT_DAYS; i++) {
    const d = wallOf(from + i * DAY_MS + 12 * HOUR_MS).date
    const start = jerusalemEpoch(d, '00:00')
    out[d] = all.filter(h => h.endAt > start - 6 * HOUR_MS && h.startAt < start + DAY_MS + 6 * HOUR_MS)
  }
  return out
}

/**
 * Assigns (or takes the member's `tableKeys`) and holds the tables. `booking` is `{ _id, businessId, test? }`.
 * `existing: true` moves the booking's own holds instead of claiming (the booking is left out of what blocks it).
 * `precheck(result)` runs before any hold is taken and may return `{ ok: false, issues }`.
 */
async function reserveTable(db, { booking, ctx, date, time, partySize, areaKey, onlineOnly, tableKeys, now, existing = false, precheck }) {
  const { businessId } = booking
  const { profile, plan, service } = ctx
  const durationMinutes = turnFor(service, partySize)
  const startAt = jerusalemEpoch(date, time)
  const endAt = startAt + durationMinutes * MIN_MS
  const holdEnd = endAt + service.bufferMinutes * MIN_MS
  const except = existing ? booking._id : undefined
  const take = keys => (existing ? holds.move : holds.claim)(db, booking, keys, startAt, holdEnd)
  const ask = { date, time, partySize, areaKey, onlineOnly, now }
  const full = async () => ({
    ok: false, code: 'NO_TABLE', reason: 'full',
    alternatives: alternatives(plan, profile, await holdsByDate(db, businessId, date, except), ask),
  })
  const done = (keys, override) => ({
    ok: true, tableKeys: keys, areaKey: areaOf(plan, keys), startAt, endAt, durationMinutes, override,
  })
  const checked = result => {
    const verdict = precheck?.(result)
    if (verdict && verdict.ok === false) throw Object.assign(new Error('INVALID_DOC'), { code: 'INVALID_DOC', issues: verdict.issues })
  }

  if (tableKeys) {
    const result = done(tableKeys, overrideOf(plan, partySize, tableKeys))
    checked(result)
    return (await take(tableKeys)).ok ? result : full()
  }

  for (let i = 0; i < TRIES; i++) {
    const day = await holds.holdsOf(db, businessId, startAt - 6 * HOUR_MS, holdEnd + 6 * HOUR_MS, except)
    const found = assign(plan, profile, day, ask)
    if (!found.ok) {
      const alts = found.reason === 'full'
        ? alternatives(plan, profile, await holdsByDate(db, businessId, date, except), ask)
        : []
      return { ok: false, code: 'NO_TABLE', reason: found.reason, alternatives: alts }
    }
    const result = done(found.tableKeys, false)
    checked(result)
    if ((await take(found.tableKeys)).ok) return result
  }
  return full()
}

/**
 * Reserve -> write -> release on failure. `doc` is the booking without its table fields. Returns
 * `{ ok: true, booking }` or the `NO_TABLE` answer; an invalid document throws `INVALID_DOC` with `issues`.
 */
async function bookTable(db, { doc, ctx, date, time, partySize, areaKey, onlineOnly, tableKeys, now, insert }) {
  const write = insert ?? (d => db.collection('bookings').insertOne(d))
  const complete = r => ({
    ...doc, date, time, startAt: r.startAt, endAt: r.endAt, durationMinutes: r.durationMinutes, partySize,
    tableKeys: r.tableKeys, ...(r.areaKey && { areaKey: r.areaKey }), ...(r.override && { override: true }),
  })
  const booking = { _id: doc._id, businessId: doc.businessId, ...(doc.test && { test: true }) }
  const r = await reserveTable(db, {
    booking, ctx, date, time, partySize, areaKey, onlineOnly, tableKeys, now,
    precheck: res => checkStoredDoc('bookings', complete(res)),
  })
  if (!r.ok) return r
  const final = complete(r)
  try {
    await write(final)
  } catch (err) {
    await holds.release(db, doc.businessId, doc._id)
    throw err
  }
  return { ok: true, booking: final }
}

/**
 * Changes a stored booking's time, party or tables. `update(change)` writes the Mongo update `change`; when it throws,
 * the holds go back to what the booking held and the error is rethrown. `{ ok: true, set }` or the `NO_TABLE` answer.
 */
async function rebookTable(db, { current, ctx, date, time, partySize, tableKeys, now, update }) {
  const next = { date: date ?? current.date, time: time ?? current.time, partySize: partySize ?? current.partySize }
  const setOf = r => ({
    ...next, startAt: r.startAt, endAt: r.endAt, durationMinutes: r.durationMinutes, tableKeys: r.tableKeys,
    ...(r.areaKey && { areaKey: r.areaKey }), ...(r.override && { override: true }), updatedAt: now,
  })
  const merged = r => {
    const { override: _old, ...rest } = current
    return { ...rest, ...setOf(r) }
  }
  const r = await reserveTable(db, {
    booking: current, ctx, ...next, areaKey: current.areaKey, onlineOnly: false, tableKeys, now, existing: true,
    precheck: res => checkStoredDoc('bookings', merged(res)),
  })
  if (!r.ok) return r
  try {
    await update({ $set: setOf(r), ...(!r.override && { $unset: { override: '' } }) })
  } catch (err) {
    const buffer = ctx.service.bufferMinutes * MIN_MS
    if (current.tableKeys?.length) await holds.move(db, current, current.tableKeys, current.startAt, current.endAt + buffer)
    else await holds.release(db, current.businessId, current._id)
    throw err
  }
  return { ok: true, set: setOf(r), override: r.override }
}

/** The client update of an approved booking (requests.js): no `lead`, plus `diner`, `lastContactAt`, counter + 1. */
async function countBooking(db, businessId, clientId, now) {
  if (clientId === WALK_IN_CLIENT_ID || clientId === TEST_CLIENT_ID) return
  const clients = db.collection('clients')
  const client = await clients.findOne({ _id: clientId, businessId })
  if (!client) return
  const kinds = [...new Set([...(client.kinds ?? []).filter(k => k !== 'lead'), 'diner'])].slice(-3)
  await clients.updateOne(
    { _id: client._id, businessId },
    { $set: { kinds, lastContactAt: now, updatedAt: now }, $inc: { 'counters.bookings': 1 } },
  )
}

/**
 * Seats a party now on the chosen tables. `ctx` is `loadTableContext(...)` plus `{ businessId, actor, now? }`. With
 * `guest` the client is found or created (BAD_CLIENT is thrown with `issues`); without it the booking belongs to
 * `'__walk_in__'` and no client is written (`name` may still label the booking).
 */
async function createWalkIn(db, ctx, { partySize, tableKeys, guest, name }) {
  const now = ctx.now ?? Date.now()
  const { date, time } = wallOf(now)
  const { businessId, actor } = ctx
  let clientId = WALK_IN_CLIENT_ID
  let guestName = name ?? ''
  let guestPhone = ''
  if (guest) {
    const { client } = await upsertClientByPhone(db, businessId, { name: guest.name, phone: guest.phone, source: 'manual', actor })
    clientId = client._id
    guestName = client.name
    guestPhone = client.phone ?? guest.phone
  }
  const doc = {
    _id: newId(), schemaVersion: 2, userId: actor.userId, businessId, createdBy: actor.userId, createdAt: now, updatedAt: now,
    kind: 'table', status: 'seated', source: 'walk_in', clientId, guestName, guestPhone, seatedAt: now,
    statusHistory: [{ status: 'seated', at: now, by: actor.userId, byName: actor.name, via: 'member' }],
    publicToken: newPublicToken(),
  }
  const res = await bookTable(db, { doc, ctx, date, time, partySize, onlineOnly: false, tableKeys, now })
  if (res.ok && guest) await countBooking(db, businessId, clientId, now)
  return res
}

/** Legal moves of a booking's status (Wave 1); `no_show` is also refused before the booking's start. */
const MOVES = {
  confirmed: ['seated', 'no_show', 'cancelled'],
  seated: ['finished', 'cancelled'],
}

/**
 * Plan 676: the one function that moves a booking's status (the route, the jobs and a guest's tap call it).
 * `{ ok: true, booking }` or `{ ok: false, code: 'NOT_FOUND' | 'BAD_STATUS' | 'STATUS_CHANGED' | 'INVALID', issues? }`.
 */
async function moveBookingStatus(db, { businessId, id, status, by, byName, via, note, now }) {
  const col = db.collection('bookings')
  const scope = { _id: id, businessId, ...LIVE }
  const current = await col.findOne(scope)
  if (!current) return { ok: false, code: 'NOT_FOUND' }
  if (!(MOVES[current.status] ?? []).includes(status) || (status === 'no_show' && now < current.startAt)) {
    return { ok: false, code: 'BAD_STATUS' }
  }
  const entry = { status, at: now, by, byName, via, ...(note && { note }) }
  const stamp = current.tableKeys?.length
    ? { ...(status === 'seated' && { seatedAt: now }), ...(status === 'finished' && { finishedAt: now }) }
    : {}
  const check = checkStoredDoc('bookings', { ...current, ...stamp, status, updatedAt: now, statusHistory: [...current.statusHistory, entry] })
  if (!check.ok) return { ok: false, code: 'INVALID', issues: check.issues }
  // Conditional on the status that was read, so two concurrent moves cannot both write.
  const result = await col.findOneAndUpdate(
    { ...scope, status: current.status },
    { $set: { status, updatedAt: now, ...stamp }, $push: { statusHistory: entry } },
    { returnDocument: 'after' },
  )
  const booking = result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result
  if (!booking) {
    const still = await col.findOne(scope, { projection: { _id: 1 } })
    return { ok: false, code: still ? 'STATUS_CHANGED' : 'NOT_FOUND' }
  }
  if (current.tableKeys?.length && ['finished', 'cancelled', 'no_show'].includes(status)) {
    await holds.release(db, current.businessId, current._id, now)
  }
  if (status === 'no_show') {
    await db.collection('clients').updateOne(
      { _id: current.clientId, businessId: current.businessId },
      { $inc: { 'counters.noShows': 1 }, $set: { updatedAt: now } },
    )
  }
  return { ok: true, booking, from: current.status }
}

module.exports = {
  MOVES, moveBookingStatus, WALK_IN_CLIENT_ID, wallOf, loadTableContext, checkTables, overrideOf, reserveTable, bookTable, rebookTable, countBooking, createWalkIn,
}
