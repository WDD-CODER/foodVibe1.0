'use strict'
/**
 * Plan 766 — POST /api/v1/ai/menu-design/variants and /refine. The model is faked by stubbing global fetch, the
 * screenshot by spying on plan 767's render service, and DNS by spying on the lookup. This proves the plumbing and the
 * cleaning, not the real model.
 */

const dns = require('node:dns')
const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
process.env.MENU_DESIGN_AI_LIMIT_MAX = '3'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { resetForTests } = require('../services/gemini-client')
const { clearCapCache } = require('../services/ai-cap')
const { _waitForUsageWritesForTests } = require('../services/ai-usage')
const { clearModuleCache } = require('../middleware/require-module')
const menuPdf = require('../services/menu-pdf')
const { menuDesignDraftSchema } = require('../generated/schemas/entities/menu-design.schema')
const { baseDesign } = require('../generated/schemas/menu-design/menu-base-templates')
const { captureLogs } = require('./helpers/log-capture')

const PNG = Buffer.from('fake png')
const PICTURE = 'https://res.cloudinary.com/demo/image/upload/bg.jpg'
const LOGO = 'https://res.cloudinary.com/demo/image/upload/logo.png'
const BUSINESS = 'b766'

let app
let logs
let fetchMock
let screenshot

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const business = (extra = {}) => ({
  _id: BUSINESS, name: 'biz', ownerId: 'o', createdAt: 1, internal: false, lastSyncedMasterVersion: 0,
  modules: ['events', 'menu_design'], ...extra,
})

beforeEach(async () => {
  resetForTests()
  clearCapCache()
  clearModuleCache()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  screenshot = vi.spyOn(menuPdf, 'screenshotUrl').mockResolvedValue(PNG)
  vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  const db = testDb()
  for (const name of ['businesses', 'aiUsage', 'GEMINI_USAGE']) await db.collection(name).deleteMany({})
  await db.collection('businesses').insertOne(business())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const modelAnswer = text => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] })
const answers = value => fetchMock.mockResolvedValue(modelAnswer(typeof value === 'string' ? value : JSON.stringify(value)))
const sent = () => JSON.parse(fetchMock.mock.calls[0][1].body)
const inlineParts = () => sent().contents[0].parts.filter(part => part.inlineData)

let userSeq = 0
const token = () => signTestToken({ userId: `design${++userSeq}`, name: 'owner', businessId: BUSINESS, businessRole: 'owner' })
const post = (route, body, auth = token()) =>
  request(app).post(`/api/v1/ai/menu-design/${route}`).set('Authorization', `Bearer ${auth}`).send(body)
const variants = (reference, auth) => post('variants', { reference }, auth)
const words = (text = 'elegant dark wedding') => ({ kind: 'text', text })
const picture = (extra = {}) => ({ kind: 'image', imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', ...extra })
const usage = async () => {
  await _waitForUsageWritesForTests()
  return testDb().collection('aiUsage').find({}).toArray()
}

const draft = (base = 'modern') => ({ ...baseDesign(base), origin: 'ai' })
const three = () => ({ variants: [draft('modern'), draft('rustic'), draft('minimal')] })

describe('POST /variants', () => {
  it('answers three valid designs and records one usage row', async () => {
    answers(three())
    const res = await variants(words())
    expect(res.status).toBe(200)
    expect(res.body.variants).toHaveLength(3)
    for (const { design, fallback } of res.body.variants) {
      expect(menuDesignDraftSchema.safeParse(design).success).toBe(true)
      expect(design.origin).toBe('ai')
      expect(fallback).toBe(false)
    }
    expect(res.body.variants.map(v => v.design.baseTemplate)).toEqual(['modern', 'rustic', 'minimal'])
    expect((await usage()).map(r => [r.feature, r.businessId])).toEqual([['menu_design_variants', BUSINESS]])
    expect(sent().generationConfig.temperature).toBe(0.8)
    expect(sent().contents[0].parts[0].text).toContain('elegant dark wedding')
    expect(inlineParts()).toHaveLength(0)
  })

  it('replaces only the invalid variants with base designs', async () => {
    const comic = { ...draft(), fonts: { title: 'Comic Sans', section: 'heebo', dish: 'heebo' } }
    answers({ variants: [comic, draft('rustic'), 'not a design'] })
    const res = await variants(words())
    expect(res.status).toBe(200)
    expect(res.body.variants.map(v => v.fallback)).toEqual([true, false, true])
    expect(res.body.variants[0].design).toEqual(baseDesign('classic'))
    expect(res.body.variants[1].design).toEqual(draft('rustic'))
    expect(res.body.variants[2].design).toEqual(baseDesign('rustic'))
  })

  it('answers three base designs, all marked, for a fully broken answer', async () => {
    answers('Sorry, I cannot design that.')
    const res = await variants(words())
    expect(res.status).toBe(200)
    expect(res.body.variants).toEqual(
      ['classic', 'modern', 'rustic'].map(base => ({ design: baseDesign(base), fallback: true })),
    )
  })

  it('never takes a picture or a fixed text from the answer', async () => {
    const greedy = {
      ...draft(),
      background: { kind: 'image', imageUrl: PICTURE, imageFit: 'cover', veil: 0 },
      logo: { url: LOGO, size: 'm', placement: 'top' },
      fixedTexts: { businessName: 'invented' },
    }
    answers({ variants: [greedy, greedy, greedy] })
    const res = await variants(words())
    for (const { design, fallback } of res.body.variants) {
      expect(fallback).toBe(false)
      expect(design.background.imageUrl).toBeUndefined()
      expect(design.background.kind).toBe('texture')
      expect(design.logo.url).toBeUndefined()
      expect(design.fixedTexts).toEqual({})
    }
  })

  it('sends a picture as one inline part with its type and the note', async () => {
    answers(three())
    const res = await variants(picture({ note: 'the header only' }))
    expect(res.status).toBe(200)
    expect(inlineParts()).toEqual([{ inlineData: { mimeType: 'image/jpeg', data: 'aGVsbG8=' } }])
    expect(sent().contents[0].parts[0].text).toContain('the header only')
  })

  it('refuses a picture over the limit without a model call', async () => {
    const res = await variants(picture({ imageBase64: 'A'.repeat(2_000_001) }))
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: 'IMAGE_TOO_LARGE', max: 1_800_000 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses another picture type and a malformed request', async () => {
    const gif = await variants(picture({ mimeType: 'image/gif' }))
    expect([gif.status, gif.body.error]).toEqual([400, 'UNSUPPORTED_FILE_TYPE'])
    const empty = await variants(words('   '))
    expect([empty.status, empty.body.error]).toEqual([400, 'INVALID_REQUEST'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['http://127.0.0.1/x', 'https://127.0.0.1/x', 'http://example.com', 'not an address'])(
    'refuses the link %s with no screenshot and no model call', async url => {
      const res = await variants({ kind: 'url', url })
      expect([res.status, res.body.error]).toEqual([400, 'URL_NOT_ALLOWED'])
      expect(screenshot).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    })

  it('photographs a public page once and sends the PNG to one model call', async () => {
    answers(three())
    const res = await variants({ kind: 'url', url: 'https://example.com' })
    expect(res.status).toBe(200)
    expect(screenshot).toHaveBeenCalledTimes(1)
    expect(screenshot).toHaveBeenCalledWith('https://example.com', { width: 1280 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(inlineParts()).toEqual([{ inlineData: { mimeType: 'image/png', data: PNG.toString('base64') } }])
  })

  it('answers 502 URL_CAPTURE_FAILED when the page cannot be photographed', async () => {
    screenshot.mockRejectedValue(Object.assign(new Error('SCREENSHOT_FAILED'), { code: 'SCREENSHOT_FAILED' }))
    const res = await variants({ kind: 'url', url: 'https://example.com' })
    expect([res.status, res.body.error]).toEqual([502, 'URL_CAPTURE_FAILED'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs no reference text and no address', async () => {
    answers(three())
    await variants(words('secret-reference-words'))
    await variants({ kind: 'url', url: 'https://example.com/secret-address' })
    expect(logs.byEvent('ai.menu_design_variants.done').length).toBeGreaterThan(0)
    const own = logs.records.filter(r => String(r.event).startsWith('ai.menu_design'))
    expect(JSON.stringify(own)).not.toMatch(/secret-reference-words|secret-address/)
  })

  it('limits one user by its own budget', async () => {
    answers(three())
    const auth = token()
    for (let i = 0; i < 3; i++) expect((await variants(words(), auth)).status).toBe(200)
    expect((await variants(words(), auth)).status).toBe(429)
    expect((await variants(words())).status).toBe(200)
  })
})

describe('POST /refine', () => {
  const current = () => ({
    ...baseDesign('classic'),
    background: { kind: 'image', imageUrl: PICTURE, imageFit: 'cover', veil: 0.2 },
    logo: { url: LOGO, size: 'm', placement: 'top' },
    fixedTexts: { businessName: 'מסעדת הים' },
  })

  it("answers the changed design, keeps the chef's own parts and records one usage row", async () => {
    answers({ ...draft(), background: { kind: 'image', imageFit: 'cover', veil: 0.6 } })
    const res = await post('refine', { design: current(), request: 'darker' })
    expect(res.status).toBe(200)
    expect(res.body.fallback).toBe(false)
    expect(res.body.design.colors).toEqual(draft().colors)
    expect(res.body.design.background).toEqual({ kind: 'image', imageUrl: PICTURE, imageFit: 'cover', veil: 0.6 })
    expect(res.body.design.logo.url).toBe(LOGO)
    expect(res.body.design.fixedTexts).toEqual({ businessName: 'מסעדת הים' })
    expect((await usage()).map(r => r.feature)).toEqual(['menu_design_refine'])
    expect(sent().generationConfig.temperature).toBe(0.3)
    expect(sent().contents[0].parts[0].text).toContain('darker')
    expect(sent().contents[0].parts[0].text).toContain('david-libre')
  })

  it('answers the sent design unchanged for an invalid answer', async () => {
    answers('nonsense')
    const res = await post('refine', { design: current(), request: 'darker' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ design: current(), fallback: true })
  })

  it('refuses an empty request and a design that is not valid, without a model call', async () => {
    for (const body of [{ design: current(), request: ' ' }, { design: { ...current(), x: 1 }, request: 'darker' }]) {
      const res = await post('refine', body)
      expect([res.status, res.body.error]).toEqual([400, 'INVALID_REQUEST'])
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('the gate', () => {
  const bodies = [
    ['variants', { reference: words() }],
    ['refine', { design: baseDesign('classic'), request: 'darker' }],
  ]

  it.each(bodies)('%s: a business without menu_design gets 403 MODULE_OFF', async (route, body) => {
    await testDb().collection('businesses').updateOne({ _id: BUSINESS }, { $set: { modules: ['events', 'ai_create'] } })
    const res = await post(route, body)
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'MODULE_OFF', module: 'menu_design' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(bodies)('%s: over the monthly cap gets the cap refusal and no model call', async (route, body) => {
    await testDb().collection('businesses').updateOne({ _id: BUSINESS }, { $set: { aiMonthlyTokenCap: 0 } })
    const res = await post(route, body)
    expect(res.status).toBe(429)
    expect(res.body.error).toBe('ai_monthly_cap_reached')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(bodies)('%s: no token gets 401', async (route, body) => {
    const res = await request(app).post(`/api/v1/ai/menu-design/${route}`).send(body)
    expect(res.status).toBe(401)
  })

  it('answers 503 without a model key', async () => {
    delete process.env.GEMINI_API_KEY
    try {
      expect((await variants(words())).status).toBe(503)
    } finally {
      process.env.GEMINI_API_KEY = 'test-key'
    }
  })
})
