'use strict'
/** Plan 767: GET /api/v1/menu-design/pdf-smoke — platform admin only; the render is mocked, no browser starts. */

const request = require('supertest')

const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app')
const menuPdf = require('../services/menu-pdf')
const { menuPdfError } = require('../services/menu-pdf/errors')

const URL = '/api/v1/menu-design/pdf-smoke'
const PDF = Buffer.from('%PDF-1.4 fake menu')
const MEASURED = { pdf: PDF, coldStartMs: 4100, renderMs: 900, nodeRssMb: 120.5, browserRssMb: 210, peakTotalMb: 330.5 }

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const bearer = payload => ({ Authorization: `Bearer ${signTestToken(payload)}` })
const admin = () => bearer({ userId: 'admin1', role: 'admin' })
const owner = () => bearer({ userId: 'owner1', role: 'user', businessRole: 'owner' })
const mockRender = () => vi.spyOn(menuPdf, 'renderPdfMeasured').mockResolvedValue(MEASURED)

describe('GET /api/v1/menu-design/pdf-smoke', () => {
  it('answers 401 without a token and 403 to an owner who is not platform admin, rendering nothing', async () => {
    const render = mockRender()
    expect((await request(app).get(URL)).status).toBe(401)
    expect((await request(app).get(URL).set(owner())).status).toBe(403)
    expect((await request(app).get(`${URL}?download=1`).set(owner())).status).toBe(403)
    expect(render).not.toHaveBeenCalled()
  })

  it('answers the measurements to a platform admin', async () => {
    const render = mockRender()
    const res = await request(app).get(URL).set(admin())
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      coldStartMs: 4100, renderMs: 900, pdfBytes: PDF.length, nodeRssMb: 120.5, browserRssMb: 210, peakTotalMb: 330.5,
      fonts: 'link',
    })
    const [html] = render.mock.calls[0]
    expect(html).toContain('תפריט ערב')
    expect(html).toContain('Powered by FoodVibe')
    expect(html).toContain('https://fonts.googleapis.com/css2')
    expect(html).not.toContain('data:font/woff2')
  })

  it('renders with the kept fonts when asked, and refuses another font mode', async () => {
    const render = mockRender()
    const res = await request(app).get(`${URL}?fonts=embedded`).set(admin())
    expect(res.body.fonts).toBe('embedded')
    const [html] = render.mock.calls[0]
    expect(html).toContain('data:font/woff2')
    expect(html).not.toContain('fonts.googleapis.com')
    const bad = await request(app).get(`${URL}?fonts=system`).set(admin())
    expect(bad.status).toBe(400)
    expect(bad.body).toEqual({ error: 'BAD_FONTS' })
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('answers the PDF itself with ?download=1', async () => {
    mockRender()
    const res = await request(app).get(`${URL}?download=1`).set(admin()).buffer(true).parse((stream, done) => {
      const chunks = []
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', () => done(null, Buffer.concat(chunks)))
    })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toBe('attachment; filename="menu-sample.pdf"')
    expect(res.body.equals(PDF)).toBe(true)
  })

  it.each(['PDF_BUSY', 'PDF_UNAVAILABLE'])('answers 503 %s and the server keeps running', async code => {
    vi.spyOn(menuPdf, 'renderPdfMeasured').mockRejectedValue(menuPdfError(code))
    const res = await request(app).get(URL).set(admin())
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ error: code })
    expect((await request(app).get('/api/v1/health')).status).toBe(200)
  })
})
