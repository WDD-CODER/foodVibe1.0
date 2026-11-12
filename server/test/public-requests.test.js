'use strict'
/** Plan 555 (C-PUBLIC, C-GUEST) — the guest request form's four routes on the real app. */
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { captureLogs } = require('./helpers/log-capture')

let app
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const QUESTIONS = [
  { key: 'diet', label: 'תזונה', type: 'text', required: true },
  { key: 'seat', label: 'ישיבה', type: 'choice', options: ['בפנים', 'בחוץ'], required: false },
  { key: 'age', label: 'גיל', type: 'number', required: false },
]
const TABLE = { enabled: true, questions: QUESTIONS, rules: { maxPartySize: 10, minBudgetPerGuest: 99, areas: ['secret'] }, defaultDurationMinutes: 90, expireAfterHours: 24 }
const PHONE = '052-123 4567'
const PHONE_DIGITS = '0521234567'
const BODY = {
  kind: 'table', guestName: 'דנה כהן', guestPhone: PHONE, wanted: { partySize: 4 },
  answers: [{ questionKey: 'diet', value: 'צמחוני' }], consentTerms: true,
}
const send = (slug, body = BODY) => request(app).post(`/api/v1/public/${slug}/requests`).send(body)
const col = name => testDb().collection(name)

async function seedProfile(businessId, slug, status = 'pilot', requestKinds = { table: TABLE, event: { ...TABLE, enabled: false } }) {
  await col('frontDeskProfiles').insertOne({
    _id: 'p_' + slug, schemaVersion: 2, businessId, createdBy: 'own', createdAt: 1, updatedAt: 1,
    businessType: 'restaurant', slug, displayName: 'בית קפה ' + slug, phone: '03-1234567', hours: [], requestKinds,
    assistant: { level: 0, tone: 'warm', greeting: 'secret greeting' }, status,
    whatsapp: { phoneNumberId: 'PNID-SECRET', ownerAlertOptIn: false },
  })
}

beforeEach(async () => {
  for (const c of ['requests', 'clients', 'frontDeskProfiles', 'bookings']) await col(c).deleteMany({})
  await seedProfile('bA', 'cafe-a')
  await seedProfile('bB', 'cafe-b')
  await seedProfile('bD', 'draft-one', 'draft')
  await seedProfile('bS', 'susp-one', 'suspended')
  await seedProfile('bC', 'cafe-c')
  await seedProfile('bT', 'cafe-t')
  await seedProfile('bL', 'cafe-l')
})

describe('GET /:slug', () => {
  it('shows the public view of a pilot profile and nothing internal', async () => {
    const res = await request(app).get('/api/v1/public/cafe-a')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ available: true, displayName: 'בית קפה cafe-a', phone: '03-1234567' })
    expect(res.body.kinds).toHaveLength(1)
    expect(res.body.kinds[0]).toMatchObject({ kind: 'table', rules: { maxPartySize: 10 }, durationMinutes: 90 })
    const text = JSON.stringify(res.body)
    for (const hidden of ['bA', 'PNID-SECRET', 'secret', 'minBudgetPerGuest', 'areas', '"status"', '_id', 'assistant', 'whatsapp']) {
      expect(text).not.toContain(hidden)
    }
  })

  it('matches the slug in lower case', async () => {
    expect((await request(app).get('/api/v1/public/CAFE-A')).body.available).toBe(true)
  })

  it('draft and suspended answer available:false; unknown answers 404', async () => {
    expect((await request(app).get('/api/v1/public/draft-one')).body).toEqual({ available: false, displayName: 'בית קפה draft-one' })
    expect((await request(app).get('/api/v1/public/susp-one')).body.available).toBe(false)
    const none = await request(app).get('/api/v1/public/nope-slug')
    expect(none.status).toBe(404)
    expect(none.body).toEqual({ error: 'NOT_FOUND' })
  })
})

describe('POST /:slug/requests', () => {
  it('creates one request for that business only, stamped as a guest', async () => {
    const res = await send('cafe-a', { ...BODY, answers: [...BODY.answers, { questionKey: 'seat', value: 'בחוץ' }] })
    expect(res.status).toBe(201)
    expect(res.body.token).toHaveLength(32)
    expect(res.body.reference).toMatch(/^[0-9A-F]{8}$/)
    const docs = await col('requests').find({}).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({
      businessId: 'bA', channel: 'public_form', createdBy: 'public:form', status: 'qualified', publicToken: res.body.token,
      answers: [{ questionKey: 'diet', label: 'תזונה', value: 'צמחוני' }, { questionKey: 'seat', label: 'ישיבה', value: 'בחוץ' }],
    })
    expect(docs[0].statusHistory[0]).toMatchObject({ by: 'public:form', via: 'guest' })
    expect(docs[0].userId).toBeUndefined()
  })

  it('finds or creates the client by phone; the consent time and source are stored on a new client', async () => {
    await send('cafe-a')
    await send('cafe-a', { ...BODY, guestPhone: '+972 52 123 4567' })
    const clients = await col('clients').find({}).toArray()
    expect(clients).toHaveLength(1)
    expect(clients[0]).toMatchObject({ businessId: 'bA', source: 'public_form', counters: { requests: 2 } })
    expect(clients[0].consent.terms).toEqual(expect.any(Number))
  })

  it('a body businessId is refused by the strict schema (400) and nothing is written', async () => {
    const res = await send('cafe-a', { ...BODY, businessId: 'bB' })
    expect(res.status).toBe(400)
    expect(res.body.issues.length).toBeGreaterThan(0)
    expect(await col('requests').countDocuments({})).toBe(0)
  })

  it("a second business's member cannot read it through the data API", async () => {
    await send('cafe-a')
    const other = { Authorization: `Bearer ${signTestToken({ userId: 'ownB', businessId: 'bB', businessRole: 'owner' })}` }
    const res = await request(app).get('/api/v1/data/requests').set(other)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
    const mine = { Authorization: `Bearer ${signTestToken({ userId: 'ownA', businessId: 'bA', businessRole: 'owner' })}` }
    expect((await request(app).get('/api/v1/data/requests').set(mine)).body).toHaveLength(1)
  })

  it('draft or suspended profile: 403 NOT_AVAILABLE; unknown slug: 404 NOT_FOUND', async () => {
    const draft = await send('draft-one')
    expect(draft.status).toBe(403)
    expect(draft.body).toEqual({ error: 'NOT_AVAILABLE' })
    expect((await send('susp-one')).status).toBe(403)
    const none = await send('nope-slug')
    expect(none.status).toBe(404)
    expect(none.body).toEqual({ error: 'NOT_FOUND' })
    expect(await col('requests').countDocuments({})).toBe(0)
  })

  it('a disabled kind: 400 KIND_DISABLED', async () => {
    const res = await send('cafe-a', { ...BODY, kind: 'event' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('KIND_DISABLED')
  })

  it('a choice outside its options and a bad number: 400 with issues; an unknown question: UNKNOWN_QUESTION', async () => {
    const choice = await send('cafe-a', { ...BODY, answers: [...BODY.answers, { questionKey: 'seat', value: 'על הגג' }] })
    expect(choice.status).toBe(400)
    expect(choice.body.issues[0].path).toBe('answers.1.value')
    const num = await send('cafe-a', { ...BODY, answers: [...BODY.answers, { questionKey: 'age', value: 'abc' }] })
    expect(num.status).toBe(400)
    const unknown = await send('cafe-a', { ...BODY, answers: [{ questionKey: 'zzz', value: 'x' }] })
    expect(unknown.status).toBe(400)
    expect(unknown.body.error).toBe('UNKNOWN_QUESTION')
    expect(await col('requests').countDocuments({})).toBe(0)
  })

  it('a missing required answer is stored as needs_info', async () => {
    const res = await send('cafe-a', { ...BODY, answers: [] })
    expect(res.status).toBe(201)
    expect((await col('requests').findOne({})).status).toBe('needs_info')
  })

  it('a missing consent is refused', async () => {
    expect((await send('cafe-a', { ...BODY, consentTerms: false })).status).toBe(400)
  })

  it('the honeypot: 201 and nothing written', async () => {
    const res = await send('cafe-a', { ...BODY, website: 'http://spam' })
    expect(res.status).toBe(201)
    expect(await col('requests').countDocuments({})).toBe(0)
    expect(await col('clients').countDocuments({})).toBe(0)
  })

  it('the 21st POST in 15 minutes from one IP to one slug: 429', async () => {
    const statuses = []
    for (let i = 0; i < 21; i++) statuses.push((await send('cafe-c', { ...BODY, website: 'bot' })).status)
    expect(statuses.slice(0, 20).every(s => s === 201)).toBe(true)
    expect(statuses[20]).toBe(429)
  })
})

describe('token routes', () => {
  async function made(slug = 'cafe-t') {
    const res = await send(slug)
    return res.body
  }

  it('GET returns only that request, without the phone, answers or decline text', async () => {
    const { token, reference } = await made()
    await made()
    const res = await request(app).get(`/api/v1/public/cafe-t/requests/${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ reference, kind: 'table', status: 'qualified', guestName: 'דנה כהן', wanted: { partySize: 4 }, displayName: 'בית קפה cafe-t' })
    const text = JSON.stringify(res.body)
    expect(text).not.toContain(PHONE_DIGITS)
    expect(text).not.toContain('צמחוני')
  })

  it('a token of slug A under slug B: 404', async () => {
    const { token } = await made()
    expect((await request(app).get(`/api/v1/public/cafe-b/requests/${token}`)).status).toBe(404)
    expect((await request(app).post(`/api/v1/public/cafe-b/requests/${token}/cancel`)).status).toBe(404)
  })

  it('a malformed token: 404 without a database read', async () => {
    const spy = vi.spyOn(testDb(), 'collection')
    const res = await request(app).get('/api/v1/public/cafe-t/requests/short')
    expect(res.status).toBe(404)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('cancel moves an open request to cancelled with a guest history entry; a second cancel and a decided request: 409', async () => {
    const { token } = await made()
    const res = await request(app).post(`/api/v1/public/cafe-t/requests/${token}/cancel`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
    const stored = await col('requests').findOne({ publicToken: token })
    expect(stored.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', by: 'public:form', via: 'guest' })
    expect((await request(app).post(`/api/v1/public/cafe-t/requests/${token}/cancel`)).status).toBe(409)

    const second = await made()
    await col('requests').updateOne({ publicToken: second.token }, { $set: { status: 'approved' } })
    const decided = await request(app).post(`/api/v1/public/cafe-t/requests/${second.token}/cancel`)
    expect(decided.status).toBe(409)
    expect(decided.body).toEqual({ error: 'ALREADY_DECIDED' })
  })

  it('an approved booking outcome shows its date, time and party', async () => {
    const { token } = await made()
    await col('bookings').insertOne({ _id: 'bk1', businessId: 'bT', date: '2030-01-01', time: '19:00', partySize: 4, status: 'confirmed' })
    await col('requests').updateOne({ publicToken: token }, { $set: { status: 'approved', outcome: { type: 'booking', id: 'bk1' } } })
    const res = await request(app).get(`/api/v1/public/cafe-t/requests/${token}`)
    expect(res.body.booking).toEqual({ date: '2030-01-01', time: '19:00', partySize: 4, status: 'confirmed' })
  })
})

describe('logs', () => {
  it('carry neither the guest phone digits nor the token after a POST, a GET by token and a cancel', async () => {
    const created = await send('cafe-l')
    const { token } = created.body
    await request(app).get(`/api/v1/public/cafe-l/requests/${token}`)
    await request(app).post(`/api/v1/public/cafe-l/requests/${token}/cancel`)
    await new Promise(resolve => setTimeout(resolve, 100))
    const text = JSON.stringify(logs.records)
    expect(text).toContain('/api/v1/public/cafe-l/requests/:token')
    expect(text).not.toContain(token)
    expect(text).not.toContain(PHONE_DIGITS)
    expect(text).not.toContain('052-123')
  })
})
