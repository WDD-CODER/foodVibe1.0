'use strict'
/** Plan 618 (C-AIDRAFT) — saveAiDraft / confirmAiDraft on the in-memory database. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { saveAiDraft, confirmAiDraft, AI_DRAFT_KEEP, AI_DRAFT_TEXT_MAX, AI_DRAFT_JSON_MAX } = require('../services/ai-drafts')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const drafts = () => testDb().collection('aiDrafts')
const fakeReq = (businessId = 'bizA', userId = 'userA') => ({
  user: { userId, name: 'User', businessId },
  log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
})
const draft = { lines: ['eggs', 'milk', 'flour'] }
const save = (req, extra = {}) => saveAiDraft(req, { feature: 'logistics_extract', input: { text: 'notes' }, aiDraft: draft, ...extra })
/** Lines saved unchanged / lines suggested. */
const ratio = (ai, saved) => saved.lines.filter(l => ai.lines.includes(l)).length / ai.lines.length

beforeEach(async () => {
  await drafts().deleteMany({})
})

describe('saveAiDraft', () => {
  it('returns a string id and stores exactly the contract fields, pending', async () => {
    const req = fakeReq()
    const id = await save(req, { subject: { type: 'menuEvent', id: 'ev1' }, input: { text: 'notes', fileId: 'f1' } })
    expect(typeof id).toBe('string')
    const doc = await drafts().findOne({ _id: id })
    expect(Object.keys(doc).sort()).toEqual(['_id', 'aiDraft', 'at', 'businessId', 'feature', 'input', 'status', 'subject', 'userId'])
    expect(doc).toMatchObject({ businessId: 'bizA', userId: 'userA', feature: 'logistics_extract', status: 'pending', subject: { type: 'menuEvent', id: 'ev1' }, input: { text: 'notes', fileId: 'f1' }, aiDraft: draft })
    expect(typeof doc.at).toBe('number')
  })

  it('stores the model name when given and leaves the key out without it', async () => {
    const withModel = await save(fakeReq(), { model: 'gemini-3.1-flash-lite' })
    expect((await drafts().findOne({ _id: withModel })).model).toBe('gemini-3.1-flash-lite')
    const without = await save(fakeReq())
    expect('model' in (await drafts().findOne({ _id: without }))).toBe(false)
    const tooLong = await save(fakeReq(), { model: 'x'.repeat(81) })
    expect('model' in (await drafts().findOne({ _id: tooLong }))).toBe(false)
  })

  it('cuts input.text to the maximum and leaves undefined keys out', async () => {
    const id = await save(fakeReq(), { input: { text: 'a'.repeat(AI_DRAFT_TEXT_MAX + 50), fileId: undefined } })
    const doc = await drafts().findOne({ _id: id })
    expect(doc.input.text.length).toBe(AI_DRAFT_TEXT_MAX)
    expect('fileId' in doc.input).toBe(false)
    expect('subject' in doc).toBe(false)
  })

  it.each([
    ['feature', req => saveAiDraft(req, { feature: 'nope', input: {}, aiDraft: draft }), fakeReq()],
    ['no_business', req => save(req), { user: { userId: 'u' }, log: { warn: vi.fn() } }],
    ['too_large', req => save(req, { aiDraft: { big: 'x'.repeat(AI_DRAFT_JSON_MAX) } }), fakeReq()],
    ['schema', req => save(req, { aiDraft: 'not an object' }), fakeReq()],
  ])('returns null and stores nothing for reason %s', async (reason, call, req) => {
    expect(await call(req)).toBeNull()
    expect(await drafts().countDocuments({})).toBe(0)
    expect(req.log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'ai.draft.save_failed', reason }))
  })

  it('a failing insert returns null and does not throw', async () => {
    const req = fakeReq()
    const coll = drafts()
    const proto = Object.getPrototypeOf(coll)
    const spy = vi.spyOn(proto, 'insertOne').mockRejectedValueOnce(new Error('boom'))
    try {
      await expect(save(req)).resolves.toBeNull()
    } finally {
      spy.mockRestore()
    }
    expect(req.log.warn).toHaveBeenCalledWith({ event: 'ai.draft.save_failed', feature: 'logistics_extract', reason: 'db' })
  })

  it('the 501st draft of one business and feature deletes the oldest; other feature and business stay', async () => {
    const rows = Array.from({ length: AI_DRAFT_KEEP }, (_, i) => ({
      _id: `old${String(i).padStart(3, '0')}`, businessId: 'bizA', userId: 'userA', feature: 'logistics_extract',
      input: {}, aiDraft: draft, status: 'pending', at: 1000 + i,
    }))
    await drafts().insertMany(rows)
    await drafts().insertMany([
      { _id: 'otherFeature', businessId: 'bizA', userId: 'userA', feature: 'invoice_read', input: {}, aiDraft: draft, status: 'pending', at: 1 },
      { _id: 'otherBiz', businessId: 'bizB', userId: 'userB', feature: 'logistics_extract', input: {}, aiDraft: draft, status: 'pending', at: 1 },
    ])
    const id = await save(fakeReq())
    expect(await drafts().countDocuments({ businessId: 'bizA', feature: 'logistics_extract' })).toBe(AI_DRAFT_KEEP)
    expect(await drafts().findOne({ _id: 'old000' })).toBeNull()
    expect(await drafts().findOne({ _id: 'old001' })).not.toBeNull()
    expect(await drafts().findOne({ _id: id })).not.toBeNull()
    expect(await drafts().findOne({ _id: 'otherFeature' })).not.toBeNull()
    expect(await drafts().findOne({ _id: 'otherBiz' })).not.toBeNull()
  })
})

describe('confirmAiDraft', () => {
  it('stores saved, keptRatio, confirmed and confirmedAt', async () => {
    const req = fakeReq()
    const id = await save(req)
    const saved = { lines: ['eggs', 'milk', 'butter'] }
    const res = await confirmAiDraft(req, id, saved, ratio)
    expect(res).toEqual({ draftId: id, keptRatio: 0.67 })
    const doc = await drafts().findOne({ _id: id })
    expect(doc).toMatchObject({ saved, keptRatio: 0.67, status: 'confirmed' })
    expect(typeof doc.confirmedAt).toBe('number')
    expect(req.log.info).toHaveBeenCalledWith({ event: 'ai.draft.confirmed', feature: 'logistics_extract', keptRatio: 0.67 })
    expect(await confirmAiDraft(req, id, saved, ratio)).toBeNull()
  })

  it('a draft of another business and an unknown id both return null', async () => {
    const id = await save(fakeReq('bizA'))
    expect(await confirmAiDraft(fakeReq('bizB', 'userB'), id, draft, ratio)).toBeNull()
    expect(await confirmAiDraft(fakeReq('bizA'), 'no-such-id', draft, ratio)).toBeNull()
    expect((await drafts().findOne({ _id: id })).status).toBe('pending')
  })

  it('a throwing ratio leaves keptRatio out and logs ratio_failed', async () => {
    const req = fakeReq()
    const id = await save(req)
    const res = await confirmAiDraft(req, id, draft, () => { throw new Error('bad') })
    expect(res).toEqual({ draftId: id, keptRatio: undefined })
    const doc = await drafts().findOne({ _id: id })
    expect(doc.status).toBe('confirmed')
    expect('keptRatio' in doc).toBe(false)
    expect(req.log.warn).toHaveBeenCalledWith({ event: 'ai.draft.ratio_failed', feature: 'logistics_extract' })
  })

  it('clamps the ratio to 0..1', async () => {
    const req = fakeReq()
    const id = await save(req)
    expect((await confirmAiDraft(req, id, draft, () => 7)).keptRatio).toBe(1)
  })
})

describe('the collection is server-only', () => {
  it('GET /api/v1/data/aiDrafts answers 403', async () => {
    const token = signTestToken({ userId: 'userA', businessId: 'bizA' })
    const res = await request(app).get('/api/v1/data/aiDrafts').set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(403)
  })
})
