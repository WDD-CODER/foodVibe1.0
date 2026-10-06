import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { MetadataRegistryService } from './metadata-registry.service'
import { ProductDataService } from './product-data.service'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
import { TranslationService } from './translation.service'
import { KeyResolutionService } from './key-resolution.service'
import { UserService } from './user.service'
import { signal } from '@angular/core'
import { Product } from '../models/product.model'

/** Fake taxonomyTerms backend: query returns the given terms; post echoes the body as a stored term. */
function fakeTermStorage(terms: Record<string, unknown>[] = []): jasmine.SpyObj<StorageService> {
  const spy = jasmine.createSpyObj<StorageService>('StorageService', ['query', 'put', 'post', 'remove'])
  spy.query.and.callFake(<T>(type: string) => Promise.resolve((type === 'taxonomyTerms' ? terms : []) as T[]))
  spy.post.and.callFake(<T>(_type: string, body: T) =>
    Promise.resolve({
      _id: 'new-' + String((body as { key?: string }).key),
      userId: 'u1',
      schemaVersion: 2,
      createdAt: 1,
      updatedAt: 1,
      ...body
    })
  )
  spy.remove.and.returnValue(Promise.resolve())
  return spy
}

describe('MetadataRegistryService', () => {
  let service: MetadataRegistryService
  let productDataSpy: jasmine.SpyObj<ProductDataService>
  const mockProductsSignal = signal<Product[]>([])

  beforeEach(fakeAsync(() => {
    const pSpy = jasmine.createSpyObj('ProductDataService', ['updateProduct'], {
      allProducts_: mockProductsSignal
    })

    const storageSpy = fakeTermStorage([
      {
        _id: 'ingredientCategory:__master__:vegetables',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'ingredientCategory',
        key: 'vegetables'
      },
      {
        _id: 'ingredientCategory:__master__:dairy',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'ingredientCategory',
        key: 'dairy'
      },
      {
        _id: 'ingredientCategory:__master__:meat',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'ingredientCategory',
        key: 'meat'
      },
      {
        _id: 'ingredientCategory:__master__:dry',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'ingredientCategory',
        key: 'dry'
      },
      {
        _id: 'ingredientCategory:__master__:fish',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'ingredientCategory',
        key: 'fish'
      },
      {
        _id: 'allergen:__master__:gluten',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'gluten'
      },
      {
        _id: 'allergen:__master__:eggs',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'eggs'
      },
      {
        _id: 'allergen:__master__:peanuts',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'peanuts'
      },
      {
        _id: 'allergen:__master__:nuts',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'nuts'
      },
      {
        _id: 'allergen:__master__:soy',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'soy'
      },
      {
        _id: 'allergen:__master__:milk solids',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'milk solids'
      },
      {
        _id: 'allergen:__master__:sesame',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'allergen',
        key: 'sesame'
      },
      {
        _id: 'course:__master__:starter',
        userId: '__master__',
        schemaVersion: 2,
        createdAt: 1,
        updatedAt: 1,
        sortOrder: 0,
        kind: 'course',
        key: 'starter',
        color: '#3B82F6'
      }
    ])

    const userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const loggingSpy = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info'])
    const translationSpy = jasmine.createSpyObj('TranslationService', [
      'translate',
      'validateKeyForHebrew',
      'resolveAllergen'
    ])
    translationSpy.validateKeyForHebrew.and.returnValue({ valid: true })
    translationSpy.resolveAllergen.and.callFake((s: string) => s?.trim().toLowerCase().replace(/\s+/g, '_') ?? null)
    const keyResolutionSpy = jasmine.createSpyObj('KeyResolutionService', ['ensureKeyForContext'])
    keyResolutionSpy.ensureKeyForContext.and.callFake((v: string) =>
      Promise.resolve(v?.trim() ? v.trim().toLowerCase().replace(/\s+/g, '_') : null)
    )

    TestBed.configureTestingModule({
      providers: [
        MetadataRegistryService,
        { provide: ProductDataService, useValue: pSpy },
        { provide: StorageService, useValue: storageSpy },
        { provide: UserService, useValue: { user_: signal(null), isAdmin_: signal(false) } },
        { provide: UserMsgService, useValue: userMsgSpy },
        { provide: LoggingService, useValue: loggingSpy },
        { provide: TranslationService, useValue: translationSpy },
        { provide: KeyResolutionService, useValue: keyResolutionSpy }
      ]
    })

    service = TestBed.inject(MetadataRegistryService)
    productDataSpy = TestBed.inject(ProductDataService) as jasmine.SpyObj<ProductDataService>
    tick() // let the taxonomy load complete
  }))

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  describe('Signal Management', () => {
    it('should register a new allergen if it does not exist', fakeAsync(() => {
      const initialCount = service.allAllergens_().length
      let key: string | null | undefined
      service.registerAllergen('shellfish').then((k) => (key = k))
      tick()
      expect(service.allAllergens_()).toContain('shellfish')
      expect(service.allAllergens_().length).toBe(initialCount + 1)
      expect(key).toBe('shellfish')
    }))

    it('should not register duplicate allergens but still return the key', fakeAsync(() => {
      const initialCount = service.allAllergens_().length
      let key: string | null | undefined
      service.registerAllergen('gluten').then((k) => (key = k))
      tick()
      expect(service.allAllergens_().length).toBe(initialCount)
      expect(key).toBe('gluten')
    }))

    it('should return null when key resolution is cancelled', fakeAsync(() => {
      let key: string | null | undefined
      service.registerAllergen('   ').then((k) => (key = k))
      tick()
      expect(key).toBeNull()
    }))
  })

  describe('Courses (dish types) have no color', () => {
    it('loads a stored course that still carries a color as { key } only', () => {
      expect(service.courses_()).toEqual([{ key: 'starter' }])
    })

    it('registers every new course with the same neutral color, whatever is already stored', fakeAsync(() => {
      const storage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>
      service.registerCourse('brunch')
      tick()
      service.registerCourse('dessert')
      tick()
      const courseBodies = storage.post.calls
        .allArgs()
        .map(([, body]) => body as { kind: string; key: string; color: string })
        .filter((b) => b.kind === 'course')
      expect(courseBodies.map((b) => [b.key, b.color])).toEqual([
        ['brunch', '#78716C'],
        ['dessert', '#78716C']
      ])
      expect(service.courses_().map((c) => c.key)).toEqual(['starter', 'brunch', 'dessert'])
    }))
  })

  describe('Async Logic: purgeGlobalUnit', () => {
    it('should update all products using the purged unit to the English "grams" key', fakeAsync(() => {
      // LOGIC CHANGE: Standardized English keys for units [cite: 407, 413]
      const productA = { _id: '1', nameHebrew: 'קמח', baseUnit: 'kg' } as Product
      const productB = { _id: '2', nameHebrew: 'מלח', baseUnit: 'kg' } as Product
      const productC = { _id: '3', nameHebrew: 'מים', baseUnit: 'liter' } as Product

      mockProductsSignal.set([productA, productB, productC])
      productDataSpy.updateProduct.and.returnValue(Promise.resolve())

      // LOGIC CHANGE: Trigger purge with English key
      service.purgeGlobalUnit('kg')
      tick() // Resolve the async loop [cite: 412, 431]

      // Only the 2 products with 'kg' should have been updated
      expect(productDataSpy.updateProduct).toHaveBeenCalledTimes(2)

      // LOGIC CHANGE: Verify fallback uses the standardized English 'gram' [cite: 407]
      expect(productDataSpy.updateProduct).toHaveBeenCalledWith(
        jasmine.objectContaining({ _id: '1', baseUnit: 'gram' })
      )
      expect(productDataSpy.updateProduct).toHaveBeenCalledWith(
        jasmine.objectContaining({ _id: '2', baseUnit: 'gram' })
      )
    }))
  })
})
