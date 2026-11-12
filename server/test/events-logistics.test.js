'use strict'
/** Plan 519 - PUT /api/v1/events/:id/logistics: owner-only, merged and stamped by the server. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuEventBody, stored, logisticsAnswer } = require('./helpers/v2-docs')

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
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }

async function seed(id, extra = {}) {
  const doc = stored(menuEventBody({ eventDate: '2026-12-01' }), {
    _id: id, userId: 'own1', businessId: 'b1', createdBy: 'own1', _masterId: id, _userModified: false,
    stage: 'inquiry', stageHistory: [], notes: [], ...extra,
  })
  await testDb().collection('menuEvents').insertOne(doc)
  return doc
}
const raw = id => testDb().collection('menuEvents').findOne({ _id: id })
const save = (id, user, body) => request(app).put(`/api/v1/events/${id}/logistics`).set(as(user)).send(body)
const ans = (itemKey, extra = {}) => {
  const { at: _a, by: _b, byName: _n, ...rest } = logisticsAnswer({ itemKey, ...extra })
  return rest
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

describe('PUT /api/v1/events/:id/logistics', () => {
  it('owner saves 2 answers, stamped with who and when', async () => {
    await seed('e1')
    const res = await save('e1', OWNER, { answers: [ans('a'), ans('b')] })
    expect(res.status).toBe(200)
    expect(res.body.siteLogistics.answers).toHaveLength(2)
    for (const a of res.body.siteLogistics.answers) {
      expect(a.by).toBe('own1')
      expect(a.at).toBeGreaterThan(1000)
    }
  })

  it('a second save moves only the changed answer; a third answer keeps the first two', async () => {
    await seed('e1')
    await save('e1', OWNER, { answers: [ans('a'), ans('b')] })
    const first = (await raw('e1')).siteLogistics.answers
    await sleep(15)
    const res = await save('e1', OWNER, { answers: [ans('a'), ans('b', { status: 'not_needed' })] })
    expect(res.status).toBe(200)
    const [a, b] = res.body.siteLogistics.answers
    expect(a.at).toBe(first[0].at)
    expect(b.at).toBeGreaterThan(first[1].at)
    expect(b.status).toBe('not_needed')
    const third = await save('e1', OWNER, { answers: [ans('c')] })
    expect(third.body.siteLogistics.answers.map(x => x.itemKey)).toEqual(['a', 'b', 'c'])
  })

  it('ignores at / by / byName from the body', async () => {
    await seed('e1')
    const res = await save('e1', OWNER, { answers: [{ ...ans('a'), at: 5, by: 'evil', byName: 'evil' }] })
    expect(res.body.siteLogistics.answers[0].by).toBe('own1')
    expect(res.body.siteLogistics.answers[0].at).toBeGreaterThan(1000)
  })

  it('phaseDone sets then unsets a key', async () => {
    await seed('e1')
    const set = await save('e1', OWNER, { phaseDone: { intake: 1700 } })
    expect(set.body.siteLogistics.phaseDone).toEqual({ intake: 1700 })
    const unset = await save('e1', OWNER, { phaseDone: { intake: null } })
    expect(unset.status).toBe(200)
    expect(unset.body.siteLogistics.phaseDone?.intake).toBeUndefined()
  })

  it('staff 403, other business 404, finished 409', async () => {
    await seed('e1')
    const staff = await save('e1', STAFF, { answers: [ans('a')] })
    expect(staff.status).toBe(403)
    expect(staff.body).toEqual(FORBIDDEN)
    expect((await save('e1', OUTSIDER, { answers: [ans('a')] })).status).toBe(404)
    await seed('e2', { stage: 'finished' })
    const done = await save('e2', OWNER, { answers: [ans('a')] })
    expect(done.status).toBe(409)
    expect(done.body.error).toBe('EVENT_FINISHED')
  })

  it('400 BAD_LOGISTICS for a non-array and 400 Validation failed for a bad status', async () => {
    await seed('e1')
    const bad = await save('e1', OWNER, { answers: 'x' })
    expect(bad.status).toBe(400)
    expect(bad.body.error).toBe('BAD_LOGISTICS')
    const maybe = await save('e1', OWNER, { answers: [ans('a', { status: 'maybe' })] })
    expect(maybe.status).toBe(400)
    expect(maybe.body.error).toBe('Validation failed')
  })

  it('environmentType creates logistics on an event without one', async () => {
    await seed('e1')
    const res = await save('e1', OWNER, { environmentType: 'outdoor_field' })
    expect(res.status).toBe(200)
    expect((await raw('e1')).logistics).toEqual({ environmentType: 'outdoor_field', resolvedItems: [] })
  })

  it('the generic data PUT does not change siteLogistics', async () => {
    await seed('e1')
    await save('e1', OWNER, { answers: [ans('a')] })
    const before = (await raw('e1')).siteLogistics
    await request(app).put('/api/v1/data/menuEvents/e1').set(as(OWNER))
      .send({ ...menuEventBody({ eventDate: '2026-12-01' }), siteLogistics: { answers: [ans('zzz')] } })
    expect((await raw('e1')).siteLogistics).toEqual(before)
  })

  it('plan 579: hiddenKeys replaces, dedupes and survives a later answer save', async () => {
    await seed('e1')
    const res = await save('e1', OWNER, { hiddenKeys: ['a', 'b', 'a'] })
    expect(res.status).toBe(200)
    expect((await raw('e1')).siteLogistics.hiddenKeys).toEqual(['a', 'b'])
    await save('e1', OWNER, { answers: [ans('c')] })
    expect((await raw('e1')).siteLogistics.hiddenKeys).toEqual(['a', 'b'])
    await save('e1', OWNER, { hiddenKeys: ['b'] })
    expect((await raw('e1')).siteLogistics.hiddenKeys).toEqual(['b'])
  })

  it('plan 579: a non-array or non-string hiddenKeys is 400 BAD_LOGISTICS; staff 403', async () => {
    await seed('e1')
    for (const hiddenKeys of ['x', [1]]) {
      const res = await save('e1', OWNER, { hiddenKeys })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('BAD_LOGISTICS')
    }
    expect((await save('e1', STAFF, { hiddenKeys: ['a'] })).status).toBe(403)
  })
})
