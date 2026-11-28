import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { MENU_DESIGN_IMAGE_MAX_BASE64 } from '@schemas/ai-menu-design.schema'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { environment } from '../../../environments/environment'
import { MenuDesignAiService, MenuDesignImageTooLargeError } from './menu-design-ai.service'

const VARIANTS_URL = `${environment.authApiUrl}/api/v1/ai/menu-design/variants`
const REFINE_URL = `${environment.authApiUrl}/api/v1/ai/menu-design/refine`

describe('MenuDesignAiService', () => {
  let service: MenuDesignAiService
  let http: HttpTestingController

  /** The request goes out after the picture is read, so wait for it. */
  async function expectPost(url: string): Promise<TestRequest> {
    for (let i = 0; i < 400; i++) {
      const [found] = http.match(url)
      if (found) return found
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`no request to ${url}`)
  }

  /** A picture of random dots: it barely compresses. */
  async function noise(edge: number): Promise<File> {
    const canvas = document.createElement('canvas')
    canvas.width = edge
    canvas.height = edge
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.createImageData(edge, edge)
    for (let i = 0; i < pixels.data.length; i++) pixels.data[i] = i % 4 === 3 ? 255 : Math.random() * 256
    ctx.putImageData(pixels, 0, 0)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
    return new File([blob], 'noise.png', { type: 'image/png' })
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(MenuDesignAiService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('posts a description as it is and answers the variants', async () => {
    const variants = [{ design: baseDesign('classic'), fallback: false }]
    const result = service.variants({ kind: 'text', text: 'כהה ואלגנטי' })
    const req = await expectPost(VARIANTS_URL)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ reference: { kind: 'text', text: 'כהה ואלגנטי' } })
    req.flush({ variants })
    expect(await result).toEqual(variants)
  })

  it('posts a link as it is', async () => {
    const result = service.variants({ kind: 'url', url: 'https://example.com' })
    const req = await expectPost(VARIANTS_URL)
    expect(req.request.body).toEqual({ reference: { kind: 'url', url: 'https://example.com' } })
    req.flush({ variants: [] })
    await result
  })

  it('sends a small picture as raw base64 with its type and the note', async () => {
    const file = new File(['hello'], 'menu.png', { type: 'image/png' })
    const result = service.variants({ kind: 'image', file, note: 'הצבעים' })
    const req = await expectPost(VARIANTS_URL)
    expect(req.request.body).toEqual({
      reference: { kind: 'image', imageBase64: 'aGVsbG8=', mimeType: 'image/png', note: 'הצבעים' }
    })
    req.flush({ variants: [] })
    await result
  })

  it('shrinks a big picture until it fits the limit', async () => {
    const result = service.variants({ kind: 'image', file: await noise(1700) })
    const req = await expectPost(VARIANTS_URL)
    const { reference } = req.request.body as { reference: { imageBase64: string; mimeType: string } }
    expect(reference.mimeType).toBe('image/jpeg')
    expect(reference.imageBase64.length).toBeLessThanOrEqual(MENU_DESIGN_IMAGE_MAX_BASE64)
    const image = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${reference.imageBase64}`)).blob())
    expect([1600, 1200]).toContain(image.width)
    req.flush({ variants: [] })
    await result
  })

  it('sends nothing when the picture cannot be made small enough', async () => {
    // Not a picture the browser can decode, so it cannot be shrunk.
    const file = new File([new Uint8Array(1_500_000)], 'menu.heic', { type: 'image/heic' })
    await expectAsync(service.variants({ kind: 'image', file })).toBeRejectedWithError(MenuDesignImageTooLargeError)
    http.expectNone(VARIANTS_URL)
  })

  it('posts the design and the words to refine', async () => {
    const design = baseDesign('modern')
    const result = service.refine(design, 'יותר כהה')
    const req = await expectPost(REFINE_URL)
    expect(req.request.body).toEqual({ design, request: 'יותר כהה' })
    req.flush({ design, fallback: false })
    expect(await result).toEqual({ design, fallback: false })
  })
})
