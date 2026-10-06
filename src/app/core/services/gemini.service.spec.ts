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
