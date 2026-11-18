import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { GeminiService } from './gemini.service'
import { MetadataRegistryService } from './metadata-registry.service'
import { TranslationService } from './translation.service'
import { environment } from '../../../environments/environment'

const URL = `${environment.authApiUrl}/api/v1/ai/generate-product-from-image`

/** Resolves once the service has finished encoding and sent its request. */
async function nextRequest(http: HttpTestingController) {
  for (let i = 0; i < 50; i++) {
    const pending = http.match(URL)
    if (pending.length) return pending[0]
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(`no request to ${URL}`)
}

describe('GeminiService.generateProductFromImage', () => {
  let service: GeminiService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MetadataRegistryService,
          useValue: { allCategories_: () => ['dairy'], allAllergens_: () => ['gluten'] }
        },
        { provide: TranslationService, useValue: { translate: (key: string) => `he:${key}` } }
      ]
    })
    service = TestBed.inject(GeminiService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('posts the photo as base64 with known metadata and returns the product', async () => {
    const file = new File(['hello'], 'label.jpg', { type: 'image/jpeg' })
    const result = service.generateProductFromImage(file, '  brand X 1kg  ')

    const req = await nextRequest(http)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({
      imageBase64: btoa('hello'),
      mimeType: 'image/jpeg',
      hint: 'brand X 1kg',
      knownCategories: ['he:dairy'],
      knownAllergens: ['he:gluten']
    })

    const product = { nameHebrew: 'קמח', baseUnit: 'kg', categories: [], allergens: [], yieldFactor: 1 }
    req.flush({ product })
    expect(await result).toEqual(jasmine.objectContaining(product))
  })

  it('omits a blank hint', async () => {
    const file = new File(['x'], 'label.png', { type: 'image/png' })
    const result = service.generateProductFromImage(file, '   ')

    const req = await nextRequest(http)
    expect('hint' in req.request.body).toBeFalse()
    req.flush({ product: {} })
    await result
  })
})

describe('GeminiService.matchProductNames', () => {
  const MATCH_URL = `${environment.authApiUrl}/api/v1/ai/match-product-names`
  let service: GeminiService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MetadataRegistryService, useValue: { allCategories_: () => [], allAllergens_: () => [] } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    service = TestBed.inject(GeminiService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('posts names and products and returns the matches', async () => {
    const names = [{ name: 'פטרוזליה', unit: 'unit' }]
    const products = [{ name: 'פטרוזיליה', unit: 'kg' }]
    const result = service.matchProductNames(names, products)

    const req = http.expectOne(MATCH_URL)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ names, products })
    req.flush({ matches: [{ i: 0, product: 0 }] })
    expect(await result).toEqual([{ i: 0, product: 0 }])
  })

  it('rejects on an HTTP error', async () => {
    const result = service.matchProductNames([{ name: 'א', unit: '' }], [{ name: 'ב', unit: '' }])
    http.expectOne(MATCH_URL).flush({ error: 'x' }, { status: 502, statusText: 'Bad Gateway' })
    await expectAsync(result).toBeRejected()
  })
})

describe('GeminiService.readInvoice', () => {
  const RECEIPT_URL = `${environment.authApiUrl}/api/v1/ai/invoices/read`
  let service: GeminiService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MetadataRegistryService, useValue: { allCategories_: () => [], allAllergens_: () => [] } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    service = TestBed.inject(GeminiService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  /** Resolves once the service has finished encoding and sent its request. */
  async function nextRequest() {
    for (let i = 0; i < 50; i++) {
      const pending = http.match(RECEIPT_URL)
      if (pending.length) return pending[0]
      await new Promise((r) => setTimeout(r, 10))
    }
    throw new Error(`no request to ${RECEIPT_URL}`)
  }

  const ANSWER = {
    header: {},
    supplier: { supplierKey: 'name:x' },
    rows: [],
    printed: [],
    truncated: false,
    draftId: null,
    fileId: null
  }

  it('posts a photo with the known categories and no model when none was chosen', async () => {
    const file = new File(['hello'], 'receipt.jpg', { type: 'image/jpeg' })
    const result = service.readInvoice(file, ['dairy'])

    const req = await nextRequest()
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ fileBase64: btoa('hello'), mimeType: 'image/jpeg', knownCategories: ['dairy'] })
    req.flush(ANSWER)
    expect(await result).toEqual(ANSWER as never)
  })

  it('adds the model once one was chosen', async () => {
    service.offerModelSwitch(
      new HttpErrorResponse({ status: 429, error: { error: 'model_exhausted', model: 'a', nextModel: 'gemini-x' } })
    )
    service.acceptModelSwitch()
    const file = new File(['hello'], 'receipt.jpg', { type: 'image/jpeg' })
    const result = service.readInvoice(file, [])
    const req = await nextRequest()
    expect(req.request.body.model).toBe('gemini-x')
    req.flush(ANSWER)
    await result
  })

  it('sends a PDF unshrunk', async () => {
    const file = new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' })
    const result = service.readInvoice(file, [])
    const req = await nextRequest()
    expect(req.request.body).toEqual({ fileBase64: btoa('%PDF'), mimeType: 'application/pdf', knownCategories: [] })
    req.flush(ANSWER)
    await result
  })

  it('rejects a PDF over 1,800,000 base64 characters with FILE_TOO_LARGE and sends no request', async () => {
    const file = new File([new Uint8Array(1_400_000)], 'invoice.pdf', { type: 'application/pdf' })
    await expectAsync(service.readInvoice(file, [])).toBeRejectedWithError('FILE_TOO_LARGE')
    http.expectNone(RECEIPT_URL)
  })

  it('rejects text/plain with FILE_TYPE_UNSUPPORTED and sends no request', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await expectAsync(service.readInvoice(file, [])).toBeRejectedWithError('FILE_TYPE_UNSUPPORTED')
    http.expectNone(RECEIPT_URL)
  })

  it('rejects a photo that stays above 1,800,000 characters after both shrink attempts with FILE_TOO_LARGE', async () => {
    // Not a decodable image, so the shrink step hands the file back unchanged.
    const file = new File([new Uint8Array(1_400_000)], 'receipt.jpg', { type: 'image/jpeg' })
    await expectAsync(service.readInvoice(file, [])).toBeRejectedWithError('FILE_TOO_LARGE')
    http.expectNone(RECEIPT_URL)
  })
})

describe('GeminiService voice and logistics notes (plan 623)', () => {
  const BASE = `${environment.authApiUrl}/api/v1/ai`
  let service: GeminiService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MetadataRegistryService, useValue: { allCategories_: () => [], allAllergens_: () => [] } },
        { provide: TranslationService, useValue: { translate: (key: string) => key } }
      ]
    })
    service = TestBed.inject(GeminiService)
    http = TestBed.inject(HttpTestingController)
    localStorage.clear()
  })

  afterEach(() => http.verify())

  async function waitFor(url: string) {
    for (let i = 0; i < 50; i++) {
      const pending = http.match(url)
      if (pending.length) return pending[0]
      await new Promise((r) => setTimeout(r, 10))
    }
    throw new Error(`no request to ${url}`)
  }

  it('transcribeVoice posts base64, mime, purpose and duration', async () => {
    const result = service.transcribeVoice(
      { blob: new Blob(['hello'], { type: 'audio/webm' }), mimeType: 'audio/webm', durationSec: 7 },
      'logistics'
    )
    const req = await waitFor(`${BASE}/voice/transcribe`)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({
      audioBase64: btoa('hello'),
      mimeType: 'audio/webm',
      purpose: 'logistics',
      durationSec: 7
    })
    req.flush({ transcript: 'שלום', fileId: 'f1' })
    expect(await result).toEqual({ transcript: 'שלום', fileId: 'f1' })
  })

  it('transcribeVoice throws AUDIO_TOO_LARGE and sends nothing when the base64 is over the limit', async () => {
    const big = new Blob([new Uint8Array(1_400_000)], { type: 'audio/webm' })
    await expectAsync(
      service.transcribeVoice({ blob: big, mimeType: 'audio/webm', durationSec: 10 }, 'stock')
    ).toBeRejectedWithError('AUDIO_TOO_LARGE')
    http.expectNone(`${BASE}/voice/transcribe`)
  })

  it('extractLogistics posts the body and returns the draft', async () => {
    const draft = { draftId: 'd1', answers: [], conflicts: [], adhoc: [], unanswered: [] }
    const result = service.extractLogistics({ eventId: 'e1', phase: 'site_visit', text: 'note' })
    const req = http.expectOne(`${BASE}/logistics/extract`)
    expect(req.request.body).toEqual({ eventId: 'e1', phase: 'site_visit', text: 'note' })
    req.flush(draft)
    expect(await result).toEqual(draft)
  })

  it('confirmLogisticsDraft posts the kept lines to the draft url', async () => {
    const saved = [{ itemKey: 'k', status: 'needed' as const }]
    const result = service.confirmLogisticsDraft('d1', saved)
    const req = http.expectOne(`${BASE}/logistics/extract/d1/confirm`)
    expect(req.request.body).toEqual({ saved })
    req.flush({})
    await result
  })
})
