'use strict'
/** Plan 442 - /api/v1/events (stage moves, notes) and the generic API's server-only event fields. */

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
const STAFF2 = { userId: 'st2', name: 'עובד שני', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }
const url = (id, rest = '') => `/api/v1/events/${id}${rest}`

async function seed(id, createdBy, extra = {}) {
  const doc = stored(menuEventBody({ eventDate: '2026-12-01' }), {
    _id: id, userId: createdBy, businessId: 'b1', createdBy, _masterId: id, _userModified: false,
    stage: 'inquiry', stageHistory: [], notes: [], ...extra,
  })
  await testDb().collection('menuEvents').insertOne(doc)
  return doc
}
const raw = id => testDb().collection('menuEvents').findOne({ _id: id })

describe('PUT /:id/stage', () => {
  it('owner moves any event and the history records who and when', async () => {
    await seed('e1', 'st1')
    const res = await request(app).put(url('e1', '/stage')).set(as(OWNER)).send({ stage: 'deposit_paid' })
    expect(res.status).toBe(200)
    expect(res.body.stage).toBe('deposit_paid')
    expect(res.body.closedAt).toEqual(expect.any(Number))
    expect(res.body.stageHistory).toEqual([
      { stage: 'deposit_paid', at: res.body.closedAt, by: 'own1', byName: 'בעלים' },
    ])
    expect((await raw('e1')).stage).toBe('deposit_paid')
  })

  it('staff cannot move an event someone else created, but can move his own', async () => {
    await seed('e1', 'own1')
    const denied = await request(app).put(url('e1', '/stage')).set(as(STAFF)).send({ stage: 'quote_sent' })
    expect(denied.status).toBe(403)
    expect(denied.body).toEqual(FORBIDDEN)
    expect((await raw('e1')).stage).toBe('inquiry')

    await seed('e2', 'st1')
    const ok = await request(app).put(url('e2', '/stage')).set(as(STAFF)).send({ stage: 'quote_sent' })
    expect(ok.status).toBe(200)
    expect(ok.body.stage).toBe('quote_sent')
  })

  it('an event of another business is 404', async () => {
    await seed('e1', 'own1')
    const res = await request(app).put(url('e1', '/stage')).set(as(OUTSIDER)).send({ stage: 'quote_sent' })
    expect(res.status).toBe(404)
  })

  it('maps the rule errors to 400 / 409 and writes nothing', async () => {
    await seed('nodate', 'own1', { eventDate: undefined })
    await testDb().collection('menuEvents').updateOne({ _id: 'nodate' }, { $unset: { eventDate: '' } })
    const noDate = await request(app).put(url('nodate', '/stage')).set(as(OWNER)).send({ stage: 'deposit_paid' })
    expect(noDate.status).toBe(400)
    expect(noDate.body.error).toBe('DATE_REQUIRED')

    await seed('e1', 'own1')
    const noReason = await request(app).put(url('e1', '/stage')).set(as(OWNER)).send({ stage: 'not_closed' })
    expect(noReason.body.error).toBe('REASON_REQUIRED')
    const finish = await request(app).put(url('e1', '/stage')).set(as(OWNER)).send({ stage: 'finished' })
    expect(finish.body.error).toBe('USE_FINISH')
    const lost = await request(app).put(url('e1', '/stage')).set(as(OWNER)).send({ stage: 'not_closed', reason: 'price' })
    expect(lost.status).toBe(200)
    expect(lost.body.notClosedReason).toBe('price')

    await seed('done', 'own1', { stage: 'finished' })
    const finished = await request(app).put(url('done', '/stage')).set(as(OWNER)).send({ stage: 'quote_sent' })
    expect(finished.status).toBe(409)
    expect(finished.body.error).toBe('EVENT_FINISHED')
    expect((await raw('nodate')).stageHistory).toEqual([])
  })

  it('needs a token', async () => {
    await seed('e1', 'own1')
    const res = await request(app).put(url('e1', '/stage')).send({ stage: 'quote_sent' })
    expect(res.status).toBe(401)
  })
})

describe('notes', () => {
  it('anyone in the business adds notes, each stamped with author and time', async () => {
    await seed('e1', 'own1')
    for (const [user, text] of [[OWNER, 'א'], [STAFF, 'ב'], [STAFF2, 'ג']]) {
      const res = await request(app).post(url('e1', '/notes')).set(as(user)).send({ text })
      expect(res.status).toBe(201)
    }
    const notes = (await raw('e1')).notes
    expect(notes.map(n => n.text)).toEqual(['א', 'ב', 'ג'])
    expect(notes.map(n => n.by)).toEqual(['own1', 'st1', 'st2'])
    expect(notes[1]).toMatchObject({ byName: 'עובד', at: expect.any(Number), _id: expect.any(String) })
  })

  it('refuses an empty and a 2,001-character note', async () => {
    await seed('e1', 'own1')
    const empty = await request(app).post(url('e1', '/notes')).set(as(OWNER)).send({ text: '  ' })
    expect(empty.status).toBe(400)
    expect(empty.body.error).toBe('NOTE_EMPTY')
    const long = await request(app).post(url('e1', '/notes')).set(as(OWNER)).send({ text: 'a'.repeat(2001) })
    expect(long.status).toBe(400)
    expect(long.body.error).toBe('NOTE_TOO_LONG')
    expect((await raw('e1')).notes).toEqual([])
  })

  it('only the author edits or deletes a note', async () => {
    await seed('e1', 'own1')
    const added = await request(app).post(url('e1', '/notes')).set(as(STAFF)).send({ text: 'ראשון' })
    const noteId = added.body.notes[0]._id

    const otherEdit = await request(app).put(url('e1', `/notes/${noteId}`)).set(as(OWNER)).send({ text: 'שונה' })
    expect(otherEdit.status).toBe(403)
    expect(otherEdit.body).toEqual(FORBIDDEN)
    const otherDelete = await request(app).delete(url('e1', `/notes/${noteId}`)).set(as(OWNER))
    expect(otherDelete.status).toBe(403)

    const edit = await request(app).put(url('e1', `/notes/${noteId}`)).set(as(STAFF)).send({ text: 'עודכן' })
    expect(edit.status).toBe(200)
    expect(edit.body.notes[0]).toMatchObject({ text: 'עודכן', editedAt: expect.any(Number), by: 'st1' })

    const del = await request(app).delete(url('e1', `/notes/${noteId}`)).set(as(STAFF))
    expect(del.status).toBe(200)
    expect(del.body.notes).toEqual([])
    expect((await raw('e1')).notes).toEqual([])
  })

  it('an unknown note is 404', async () => {
    await seed('e1', 'own1')
    const res = await request(app).delete(url('e1', '/notes/nope')).set(as(OWNER))
    expect(res.status).toBe(404)
  })
})

describe('generic data API keeps stage and notes server-only', () => {
  it('POST starts every event in inquiry with one history entry and no notes', async () => {
    const res = await request(app).post('/api/v1/data/menuEvents').set(as(OWNER)).send(menuEventBody({
      stage: 'finished', stageHistory: [], closedAt: 5, notes: [{ _id: 'x', text: 'y', at: 1, by: 'a', byName: 'b' }], legacy: true,
    }))
    expect(res.status).toBe(201)
    expect(res.body.stage).toBe('inquiry')
    expect(res.body.stageHistory).toEqual([{ stage: 'inquiry', at: expect.any(Number), by: 'own1', byName: 'בעלים' }])
    expect(res.body.notes).toEqual([])
    expect(res.body.closedAt).toBeUndefined()
    expect(res.body.legacy).toBeUndefined()
  })

  it('PUT leaves stage, history, notes and closedAt as stored', async () => {
    await seed('e1', 'own1', { stage: 'ordering', closedAt: 7, stageHistory: [{ stage: 'ordering', at: 7, by: 'own1', byName: 'בעלים' }] })
    const before = await raw('e1')
    const res = await request(app).put('/api/v1/data/menuEvents/e1').set(as(OWNER)).send({
      name: 'שם חדש', stage: 'inquiry', stageHistory: [], notes: [{ _id: 'x', text: 'y', at: 1, by: 'a', byName: 'b' }], closedAt: 99, legacy: true,
    })
    expect(res.status).toBe(200)
    const after = await raw('e1')
    expect(after.name).toBe('שם חדש')
    for (const key of ['stage', 'stageHistory', 'notes', 'closedAt', 'legacy']) {
      expect(after[key]).toEqual(before[key])
    }
  })
})

describe('plan 427 locked-kind finding stays closed', () => {
  it('staff cannot move a term into a locked kind with a PUT', async () => {
    await testDb().collection('taxonomyTerms').deleteMany({})
    const term = { _id: 't1', schemaVersion: 2, kind: 'label', key: 'x1', sortOrder: 0, color: '#78716C', userId: 'st1', businessId: 'b1', createdBy: 'st1', createdAt: 1, updatedAt: 1 }
    await testDb().collection('taxonomyTerms').insertOne(term)
    const res = await request(app).put('/api/v1/data/taxonomyTerms/t1').set(as(STAFF)).send({ kind: 'eventType' })
    expect(res.status).toBe(400)
    expect((await testDb().collection('taxonomyTerms').findOne({ _id: 't1' })).kind).toBe('label')
  })
})
