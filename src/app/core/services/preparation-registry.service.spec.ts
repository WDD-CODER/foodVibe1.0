import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { PreparationRegistryService } from './preparation-registry.service'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'

describe('PreparationRegistryService', () => {
  let service: PreparationRegistryService
  let storageSpy: jasmine.SpyObj<StorageService>

  beforeEach(fakeAsync(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'put', 'post'])
    storageSpy.query.and.returnValue(Promise.resolve([]))
    storageSpy.put.and.returnValue(Promise.resolve({ _id: 'p1' }))
    storageSpy.post.and.returnValue(Promise.resolve({ _id: 'p1', categories: [], preparations: [] }))

    const userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const translationSpy = jasmine.createSpyObj('TranslationService', ['updateDictionary'])

    TestBed.configureTestingModule({
      providers: [
        PreparationRegistryService,
        { provide: StorageService, useValue: storageSpy },
        { provide: UserMsgService, useValue: userMsgSpy },
        { provide: TranslationService, useValue: translationSpy }
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

  it('should register a category and persist', fakeAsync(() => {
    storageSpy.query.and.returnValue(Promise.resolve([]))
    service.registerCategory('cooking_station', 'עמדת בישול')
    tick()
    expect(service.preparationCategories_()).toContain('cooking_station')
    expect(storageSpy.post).toHaveBeenCalled()
  }))

  it('should register a preparation and persist', fakeAsync(() => {
    storageSpy.query.and.returnValue(
      Promise.resolve([{ _id: 'p1', categories: ['מטבח'], preparations: [] }])
    )
    service.registerPreparation('רוטב עגבניות', 'מטבח')
    tick()
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
