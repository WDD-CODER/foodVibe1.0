import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import type { Product } from '@models/product.model'
import { ProductNameMatcherService } from './product-name-matcher.service'
import { KitchenStateService } from './kitchen-state.service'
import { GeminiService } from './gemini.service'
import { LoggingService } from './logging.service'

const product = (_id: string, nameHebrew: string, baseUnit = 'kg'): Product =>
  ({ _id, nameHebrew, baseUnit, price: 12, supplierId: 'sup-secret' }) as unknown as Product

describe('ProductNameMatcherService', () => {
  let service: ProductNameMatcherService
  let products_: ReturnType<typeof signal<Product[]>>
  let gemini: jasmine.SpyObj<GeminiService>
  let logging: jasmine.SpyObj<LoggingService>

  beforeEach(() => {
    products_ = signal([product('p1', 'עגבנייה'), product('p2', 'פטרוזיליה'), product('p3', 'מלח')])
    gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['matchProductNames'])
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['error'])
    TestBed.configureTestingModule({
      providers: [
        { provide: KitchenStateService, useValue: { products_ } },
        { provide: GeminiService, useValue: gemini },
        { provide: LoggingService, useValue: logging }
      ]
    })
    service = TestBed.inject(ProductNameMatcherService)
  })

  it('matchExact links a plural without any call', () => {
    const hit = service.matchExact('עגבניות')
    expect(hit?.kind).toBe('variant')
    expect(hit && hit.kind !== 'ambiguous' && hit.product._id).toBe('p1')
    expect(gemini.matchProductNames).not.toHaveBeenCalled()
  })

  it('does not call the AI step when every name matched exactly or by variant', async () => {
    const out = await service.matchNames([
      { key: 'a', name: 'עגבניות' },
      { key: 'b', name: 'מלח' }
    ])
    expect(gemini.matchProductNames).not.toHaveBeenCalled()
    expect(out.get('a')).toEqual({ product: products_()[0], via: 'variant' })
    expect(out.get('b')?.via).toBe('exact')
  })

  it('asks the AI once for the leftover name with names and units only, and maps the position back', async () => {
    gemini.matchProductNames.and.resolveTo([{ i: 0, product: 1 }])
    const out = await service.matchNames([
      { key: 'a', name: 'מלח' },
      { key: 'b', name: 'צרור פטרוזיליה', unit: 'unit' }
    ])
    expect(gemini.matchProductNames).toHaveBeenCalledTimes(1)
    const [names, candidates] = gemini.matchProductNames.calls.mostRecent().args
    expect(names).toEqual([{ name: 'צרור פטרוזיליה', unit: 'unit' }])
    expect(candidates.length).toBe(3)
    const sent = JSON.stringify([names, candidates])
    for (const forbidden of ['_id', 'price', 'sup-secret', 'supplier']) expect(sent).not.toContain(forbidden)
    expect(candidates.every((c) => Object.keys(c).sort().join() === 'name,unit')).toBeTrue()
    expect(out.get('b')).toEqual({ product: products_()[1], via: 'ai' })
    expect(out.get('a')?.via).toBe('exact')
  })

  it('ignores a position outside the list and a null answer', async () => {
    gemini.matchProductNames.and.resolveTo([
      { i: 0, product: 9 },
      { i: 1, product: null },
      { i: 7, product: 0 }
    ])
    const out = await service.matchNames([
      { key: 'a', name: 'שום' },
      { key: 'b', name: 'כמון' }
    ])
    expect(out.size).toBe(0)
  })

  it('sends an ambiguous name to the AI step', async () => {
    products_.set([product('p1', 'עגבנייה'), product('p2', 'עגבניה')])
    gemini.matchProductNames.and.resolveTo([{ i: 0, product: 0 }])
    const out = await service.matchNames([{ key: 'a', name: 'עגבניות' }])
    expect(gemini.matchProductNames).toHaveBeenCalledTimes(1)
    expect(out.get('a')?.via).toBe('ai')
  })

  it('keeps the name unmatched, logs and reports once on an HTTP error, without throwing', async () => {
    gemini.matchProductNames.and.rejectWith(new Error('502'))
    const onAiFailure = jasmine.createSpy('onAiFailure')
    const out = await service.matchNames([{ key: 'a', name: 'שום' }], { onAiFailure })
    expect(out.size).toBe(0)
    expect(logging.error).toHaveBeenCalledTimes(1)
    expect(onAiFailure).toHaveBeenCalledTimes(1)
  })

  it('makes no call when there are no products', async () => {
    products_.set([])
    const out = await service.matchNames([{ key: 'a', name: 'שום' }])
    expect(gemini.matchProductNames).not.toHaveBeenCalled()
    expect(out.size).toBe(0)
  })

  it('makes no call for blank names', async () => {
    const out = await service.matchNames([{ key: 'a', name: '  ' }])
    expect(gemini.matchProductNames).not.toHaveBeenCalled()
    expect(out.size).toBe(0)
  })

  it('over 1000 products sends only those sharing the first two letters, capped at 1000', async () => {
    const many = Array.from({ length: 1500 }, (_, n) => product(`x${n}`, `ת${n}`))
    products_.set([...many, product('s1', 'שמן זית'), product('s2', 'שמנת')])
    gemini.matchProductNames.and.resolveTo([])
    await service.matchNames([{ key: 'a', name: 'שמן' }])
    const candidates = gemini.matchProductNames.calls.mostRecent().args[1]
    expect(candidates.map((c) => c.name)).toEqual(['שמן זית', 'שמנת'])
  })
})
