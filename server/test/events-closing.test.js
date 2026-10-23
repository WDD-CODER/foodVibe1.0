'use strict'
/** Plan 446 - planning snapshot freeze, closing, finish, reopen and refresh on /api/v1/events. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuEventBody, stored } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('menuEvents').deleteMany({})
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }
const url = (id, rest = '') => `/api/v1/events/${id}${rest}`
const PHOTO = 'https://res.cloudinary.com/demo/image/upload/note.jpg'

const snapshot = (extra = {}) => ({
  at: 1000,
  suppliers: [
    { supplierId: 's1', name: 'ירקן', plannedCost: 1000 },
    { supplierId: 's2', name: 'קצב', plannedCost: 2000 },
  ],
  extraCosts: 1000,
  plannedRevenue: 10000,
  plannedProfit: 6000,
  plannedProfitPct: 60,
  ...extra,
})

async function seed(id, extra = {}) {
  const doc = stored(menuEventBody({ eventDate: '2026-12-01' }), {
    _id: id, userId: 'own1', businessId: 'b1', createdBy: 'own1', _masterId: id, _userModified: false,
    stage: 'inquiry', stageHistory: [], notes: [], ...extra,
  })
  await testDb().collection('menuEvents').insertOne(doc)
  return doc
}
const raw = id => testDb().collection('menuEvents').findOne({ _id: id })
const put = (id, rest, user, body) => request(app).put(url(id, rest)).set(as(user)).send(body)
const post = (id, rest, user, body = {}) => request(app).post(url(id, rest)).set(as(user)).send(body)

describe('planning snapshot on PUT /:id/stage', () => {
  it('stores on "הזמנות", freezes on "ביצוע", and a later different snapshot changes nothing', async () => {
    await seed('e1', { stage: 'deposit_paid', closedAt: 5 })
    const ordering = await put('e1', '/stage', OWNER, { stage: 'ordering', planSnapshot: snapshot() })
    expect(ordering.status).toBe(200)
    expect(ordering.body.planSnapshot.frozenAt).toBeUndefined()
    expect(ordering.body.planSnapshot.suppliers).toHaveLength(2)

    const execution = await put('e1', '/stage', OWNER, { stage: 'execution' })
    expect(execution.body.planSnapshot.frozenAt).toEqual(expect.any(Number))

    const back = await put('e1', '/stage', OWNER, { stage: 'ordering', planSnapshot: snapshot({ plannedProfit: 1 }) })
    expect(back.status).toBe(200)
    const after = await raw('e1')
    expect(after.planSnapshot.plannedProfit).toBe(6000)
    expect(after.planSnapshot.frozenAt).toEqual(execution.body.planSnapshot.frozenAt)
  })

  it('an event that skips "הזמנות" gets its snapshot frozen at once', async () => {
    await seed('e1', { stage: 'deposit_paid', closedAt: 5 })
    const res = await put('e1', '/stage', OWNER, { stage: 'post_production', planSnapshot: snapshot({ frozenAt: 1 }) })
    expect(res.status).toBe(200)
    expect(res.body.planSnapshot.frozenAt).toBeGreaterThan(1)
  })

  it('refuses a snapshot with a negative amount', async () => {
    await seed('e1', { stage: 'deposit_paid', closedAt: 5 })
    const res = await put('e1', '/stage', OWNER, { stage: 'ordering', planSnapshot: snapshot({ extraCosts: -1 }) })
    expect(res.status).toBe(400)
    expect((await raw('e1')).planSnapshot).toBeUndefined()
  })
})

describe('the generic data API', () => {
  it('keeps a frozen snapshot, takes a fresh one before the freeze, and ignores closing', async () => {
    await seed('e1', { stage: 'ordering', closedAt: 5, planSnapshot: snapshot() })
    const open = await request(app).put('/api/v1/data/menuEvents/e1').set(as(OWNER))
      .send({ planSnapshot: snapshot({ plannedProfit: 7000, frozenAt: 99 }) })
    expect(open.status).toBe(200)
    const unfrozen = await raw('e1')
    expect(unfrozen.planSnapshot.plannedProfit).toBe(7000)
    expect(unfrozen.planSnapshot.frozenAt).toBeUndefined()

    await testDb().collection('menuEvents').updateOne({ _id: 'e1' }, { $set: { 'planSnapshot.frozenAt': 50 } })
    const frozen = await request(app).put('/api/v1/data/menuEvents/e1').set(as(OWNER))
      .send({ planSnapshot: snapshot({ plannedProfit: 1 }), closing: { suppliers: [] } })
    expect(frozen.status).toBe(200)
    const after = await raw('e1')
    expect(after.planSnapshot.plannedProfit).toBe(7000)
    expect(after.planSnapshot.frozenAt).toBe(50)
    expect(after.closing).toBeUndefined()
  })

  it('POST stores a new event without closing or snapshot', async () => {
    const res = await request(app).post('/api/v1/data/menuEvents').set(as(OWNER))
      .send({ ...menuEventBody(), closing: { suppliers: [] }, planSnapshot: snapshot() })
    expect(res.status).toBe(201)
    const doc = await raw(res.body._id)
    expect(doc.closing).toBeUndefined()
    expect(doc.planSnapshot).toBeUndefined()
  })
})

describe('PUT /:id/closing', () => {
  const baseClosing = () => ({
    suppliers: [
      { supplierId: 's1', name: 'ירקן', planned: 1000, arrived: false, hasInvoice: false, photos: [] },
      { supplierId: 's2', name: 'קצב', planned: 2000, arrived: false, hasInvoice: false, photos: [] },
    ],
  })

  it('staff may tick arrived, invoice and add a photo, but not change an amount', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    const closing = baseClosing()
    closing.suppliers[0] = { ...closing.suppliers[0], arrived: true, hasInvoice: true, photos: [PHOTO] }
    const ok = await put('e1', '/closing', STAFF, { closing })
    expect(ok.status).toBe(200)
    expect((await raw('e1')).closing.suppliers[0]).toMatchObject({ arrived: true, hasInvoice: true, photos: [PHOTO] })

    // Amount-only change on the copy just stored (plan 488: a copy that also carried a tick would merge the tick only).
    const money = structuredClone(closing)
    money.suppliers[0].actualPaid = 5
    const denied = await put('e1', '/closing', STAFF, { closing: money })
    expect(denied.status).toBe(403)
    expect(denied.body).toEqual(FORBIDDEN)
    expect((await raw('e1')).closing.suppliers[0].actualPaid).toBeUndefined()
  })

  // Plan 488: a staff copy older than the owner's last change never drops the tick and never writes money.
  const ownerClosing = () => {
    const closing = { ...baseClosing(), actualExtraCosts: 900, actualRevenue: 9000 }
    closing.suppliers[0].actualPaid = 1150
    return closing
  }

  it('a staff tick on an older copy (no amounts) is kept, the owner amounts stay', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }), closing: ownerClosing() })
    const stale = baseClosing()
    stale.suppliers[0].arrived = true
    const res = await put('e1', '/closing', STAFF, { closing: stale })
    expect(res.status).toBe(200)
    const after = (await raw('e1')).closing
    expect(after.suppliers[0]).toMatchObject({ arrived: true, actualPaid: 1150 })
    expect(after.actualRevenue).toBe(9000)
    expect(after.actualExtraCosts).toBe(900)
  })

  it('a staff tick on a copy without the row the owner added keeps that row', async () => {
    const closing = ownerClosing()
    closing.suppliers.push({ supplierId: 's3', name: 'דגים', planned: 0, arrived: false, hasInvoice: false, photos: [] })
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }), closing })
    const stale = baseClosing()
    stale.suppliers[1].hasInvoice = true
    const res = await put('e1', '/closing', STAFF, { closing: stale })
    expect(res.status).toBe(200)
    const after = (await raw('e1')).closing
    expect(after.suppliers.map(r => r.supplierId)).toEqual(['s1', 's2', 's3'])
    expect(after.suppliers[1].hasInvoice).toBe(true)
    expect(after.suppliers[0].actualPaid).toBe(1150)
  })

  it('a staff copy with an extra row: no tick → 403 and nothing stored; with a tick → only the tick is stored', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }), closing: baseClosing() })
    const extra = baseClosing()
    extra.suppliers.push({ supplierId: 's9', name: 'זר', planned: 0, arrived: true, hasInvoice: false, photos: [] })
    const denied = await put('e1', '/closing', STAFF, { closing: extra })
    expect(denied.status).toBe(403)
    expect(denied.body).toEqual(FORBIDDEN)
    expect((await raw('e1')).closing).toEqual(baseClosing())

    extra.suppliers[0].arrived = true
    const ok = await put('e1', '/closing', STAFF, { closing: extra })
    expect(ok.status).toBe(200)
    const after = (await raw('e1')).closing
    expect(after.suppliers.map(r => r.supplierId)).toEqual(['s1', 's2'])
    expect(after.suppliers[0].arrived).toBe(true)
  })

  it('the owner changes amounts', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    const closing = { ...baseClosing(), actualExtraCosts: 900, actualRevenue: 9000 }
    closing.suppliers[0].actualPaid = 1150
    const res = await put('e1', '/closing', OWNER, { closing })
    expect(res.status).toBe(200)
    expect(res.body.closing).toMatchObject({ actualExtraCosts: 900, actualRevenue: 9000 })
    expect(res.body.closing.suppliers[0].actualPaid).toBe(1150)
  })

  it('refuses a photo that is not on Cloudinary, more than 10 photos, and duplicate rows', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    const bad = baseClosing()
    bad.suppliers[0].photos = ['https://example.com/a.jpg']
    expect((await put('e1', '/closing', OWNER, { closing: bad })).status).toBe(400)
    const many = baseClosing()
    many.suppliers[0].photos = Array.from({ length: 11 }, () => PHOTO)
    expect((await put('e1', '/closing', OWNER, { closing: many })).status).toBe(400)
    const dup = baseClosing()
    dup.suppliers.push({ ...dup.suppliers[0] })
    const res = await put('e1', '/closing', OWNER, { closing: dup })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('DUPLICATE_SUPPLIER')
  })

  it('an event with no plan has nothing to close', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5 })
    const res = await put('e1', '/closing', OWNER, { closing: baseClosing() })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('NO_PLAN')
  })

  it('a finished event is locked', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    expect((await post('e1', '/finish', OWNER)).status).toBe(200)
    const res = await put('e1', '/closing', OWNER, { closing: baseClosing() })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('EVENT_FINISHED')
  })
})

describe('finish, reopen and refresh', () => {
  it('only the owner finishes, from "פוסט-פרודקשן", with stamps and history', async () => {
    await seed('e1', { stage: 'post_production', planSnapshot: snapshot({ frozenAt: 3 }) })
    const denied = await post('e1', '/finish', STAFF)
    expect(denied.status).toBe(403)
    expect(denied.body).toEqual(FORBIDDEN)

    const res = await post('e1', '/finish', OWNER)
    expect(res.status).toBe(200)
    expect(res.body.stage).toBe('finished')
    expect(res.body.closing.finishedAt).toEqual(expect.any(Number))
    expect(res.body.closing.finishedBy).toBe('own1')
    expect(res.body.closing.suppliers).toHaveLength(2)
    expect(res.body.closedAt).toEqual(expect.any(Number))
    expect(res.body.stageHistory.at(-1)).toMatchObject({ stage: 'finished', by: 'own1', byName: 'בעלים' })

    expect((await post('e1', '/finish', OWNER)).status).toBe(409)
    const viaStage = await put('e1', '/stage', OWNER, { stage: 'quote_sent' })
    expect(viaStage.status).toBe(409)
  })

  it('keeps closedAt when it was set, and refuses to finish from a stage before "ביצוע"', async () => {
    await seed('e1', { stage: 'execution', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    expect((await post('e1', '/finish', OWNER)).body.closedAt).toBe(5)
    await seed('e2', { stage: 'quote_sent' })
    const early = await post('e2', '/finish', OWNER)
    expect(early.status).toBe(400)
    expect(early.body.error).toBe('FINISH_FROM_STAGE')
    const viaStage = await put('e2', '/stage', OWNER, { stage: 'finished' })
    expect(viaStage.status).toBe(400)
    expect(viaStage.body.error).toBe('USE_FINISH')
  })

  it('reopen goes back to "פוסט-פרודקשן" and removes the finish stamps', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    await post('e1', '/finish', OWNER)
    expect((await post('e1', '/reopen', STAFF)).status).toBe(403)
    const res = await post('e1', '/reopen', OWNER)
    expect(res.status).toBe(200)
    expect(res.body.stage).toBe('post_production')
    expect(res.body.closing.finishedAt).toBeUndefined()
    expect(res.body.closing.finishedBy).toBeUndefined()
    expect(res.body.stageHistory.map(h => h.stage)).toEqual(['finished', 'post_production'])
    const again = await post('e1', '/reopen', OWNER)
    expect(again.status).toBe(400)
  })

  it('refresh-plan is owner only, replaces the snapshot and keeps frozenAt', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    const body = { planSnapshot: snapshot({ plannedProfit: 100, frozenAt: 999 }) }
    expect((await post('e1', '/refresh-plan', STAFF, body)).status).toBe(403)
    const res = await post('e1', '/refresh-plan', OWNER, body)
    expect(res.status).toBe(200)
    expect(res.body.planSnapshot.plannedProfit).toBe(100)
    expect(res.body.planSnapshot.frozenAt).toBe(3)
  })

  it('refresh-plan on an old event with no snapshot stores it frozen', async () => {
    await seed('e1', { stage: 'post_production', closedAt: 5 })
    const res = await post('e1', '/refresh-plan', OWNER, { planSnapshot: snapshot() })
    expect(res.status).toBe(200)
    expect(res.body.planSnapshot.frozenAt).toEqual(expect.any(Number))
  })

  it('refresh-plan keeps typed closing values and updates the planned amounts', async () => {
    await seed('e1', {
      stage: 'post_production', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }),
      closing: { suppliers: [{ supplierId: 's1', name: 'ירקן', planned: 1000, actualPaid: 1100, arrived: true, hasInvoice: false, photos: [] }] },
    })
    const res = await post('e1', '/refresh-plan', OWNER, {
      planSnapshot: snapshot({
        suppliers: [
          { supplierId: 's1', name: 'ירקן', plannedCost: 1200 },
          { supplierId: null, name: 'ללא ספק', plannedCost: 5 },
        ],
      }),
    })
    expect(res.status).toBe(200)
    expect(res.body.closing.suppliers[0]).toMatchObject({ planned: 1200, actualPaid: 1100, arrived: true })
    expect(res.body.closing.suppliers[1]).toMatchObject({ supplierId: null, planned: 5 })
  })

  it('refresh-plan on a finished event is 409', async () => {
    await seed('e1', { stage: 'finished', closedAt: 5, planSnapshot: snapshot({ frozenAt: 3 }) })
    expect((await post('e1', '/refresh-plan', OWNER, { planSnapshot: snapshot() })).status).toBe(409)
  })
})
