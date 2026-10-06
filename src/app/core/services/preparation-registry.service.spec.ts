import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { PreparationRegistryService } from './preparation-registry.service'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { KeyResolutionService } from './key-resolution.service'
import { UserService } from './user.service'
import { signal } from '@angular/core'

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

describe('PreparationRegistryService', () => {
  let service: PreparationRegistryService
  let storageSpy: jasmine.SpyObj<StorageService>

  beforeEach(fakeAsync(() => {
    storageSpy = fakeTermStorage()

    const userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const translationSpy = jasmine.createSpyObj('TranslationService', [
      'updateDictionary',
      'resolvePreparationCategory'
    ])
    translationSpy.resolvePreparationCategory.and.returnValue('מטבח')
    const keyResolutionSpy = jasmine.createSpyObj('KeyResolutionService', ['ensureKeyForContext'])
    keyResolutionSpy.ensureKeyForContext.and.callFake((v: string) =>
      Promise.resolve(v?.trim() ? v.trim().toLowerCase().replace(/\s+/g, '_') : null)
    )

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PreparationRegistryService,
        { provide: StorageService, useValue: storageSpy },
        { provide: UserService, useValue: { user_: signal(null), isAdmin_: signal(false) } },
        { provide: UserMsgService, useValue: userMsgSpy },
        { provide: TranslationService, useValue: translationSpy },
        { provide: KeyResolutionService, useValue: keyResolutionSpy }
      ]
    })

    service = TestBed.inject(PreparationRegistryService)
    tick()
  }))

  it('should be created', () => {
    expect(service).toBeTruthy()
    expect(service.preparationCategories_()).toEqual([])
    expect(service.allPreparations_()).toEqual([])
  })

  it('should register a category and persist it as a prepCategory term', fakeAsync(() => {
    service.registerCategory('cooking_station', 'עמדת בישול')
    tick()
    expect(service.preparationCategories_()).toContain('cooking_station')
    expect(storageSpy.post).toHaveBeenCalledWith(
      'taxonomyTerms',
      jasmine.objectContaining({ kind: 'prepCategory', key: 'cooking_station' })
    )
  }))

  it('should register a preparation and persist', fakeAsync(() => {
    service.registerPreparation('רוטב עגבניות', 'מטבח')
    flush()
    expect(service.allPreparations_().length).toBe(1)
    expect(service.allPreparations_()[0].name).toBe('רוטב עגבניות')
    expect(service.allPreparations_()[0].category).toBe('מטבח')
  }))

  it('should not add duplicate category', fakeAsync(() => {
    service.registerCategory('kitchen', 'מטבח')
    tick()
    const countBefore = service.preparationCategories_().length
    service.registerCategory('kitchen', 'מטבח')
    tick()
    expect(service.preparationCategories_().length).toBe(countBefore)
  }))
})
