import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
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

describe('GeminiService.parseReceiptPhoto', () => {
  const RECEIPT_URL = `${environment.authApiUrl}/api/v1/ai/parse-receipt-photo`
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

  it('posts the photo with the known categories and returns { rows, truncated }', async () => {
    const file = new File(['hello'], 'receipt.jpg', { type: 'image/jpeg' })
    const result = service.parseReceiptPhoto(file, ['dairy'])

    const req = await nextRequest()
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ imageBase64: btoa('hello'), mimeType: 'image/jpeg', knownCategories: ['dairy'] })

    const answer = { rows: [{ name: 'חלב', baseUnit: 'liter', price: 5 }], truncated: false }
    req.flush(answer)
    expect(await result).toEqual(answer as never)
  })

  it('rejects a PDF with IMAGE_TYPE_UNSUPPORTED and sends no request', async () => {
    const file = new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' })
    await expectAsync(service.parseReceiptPhoto(file, [])).toBeRejectedWithError('IMAGE_TYPE_UNSUPPORTED')
    http.expectNone(RECEIPT_URL)
  })

  it('rejects a photo that stays above 1,800,000 characters after both shrink attempts with IMAGE_TOO_LARGE', async () => {
    // Not a decodable image, so the shrink step hands the file back unchanged: 1.4 MB -> about 1.87 million characters.
    const file = new File([new Uint8Array(1_400_000)], 'receipt.jpg', { type: 'image/jpeg' })
    await expectAsync(service.parseReceiptPhoto(file, [])).toBeRejectedWithError('IMAGE_TOO_LARGE')
    http.expectNone(RECEIPT_URL)
  })
})
