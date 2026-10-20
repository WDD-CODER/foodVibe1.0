import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { UnitRegistryService } from './unit-registry.service'
import { StorageService } from './async-storage.service'
import { UserMsgService } from './user-msg.service'
import { LoggingService } from './logging.service'
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

describe('UnitRegistryService', () => {
  let service: UnitRegistryService

  let userMsgSpy: jasmine.SpyObj<Pick<UserMsgService, 'onSetSuccessMsg' | 'onSetErrorMsg'>>

  beforeEach(fakeAsync(() => {
    const storageSpy = fakeTermStorage()

    userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const loggingSpy = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info'])
    const translationSpy = jasmine.createSpyObj('TranslationService', [
      'translate',
      'validateKeyForHebrew',
      'resolveUnit'
    ])
    translationSpy.validateKeyForHebrew.and.returnValue({ valid: true })
    translationSpy.resolveUnit.and.callFake((s: string) => s?.trim().toLowerCase().replace(/\s+/g, '_') ?? null)
    const keyResolutionSpy = jasmine.createSpyObj('KeyResolutionService', ['ensureKeyForContext'])
    keyResolutionSpy.ensureKeyForContext.and.callFake((v: string) =>
      Promise.resolve(v?.trim() ? v.trim().toLowerCase().replace(/\s+/g, '_') : null)
    )

    TestBed.configureTestingModule({
      providers: [
        UnitRegistryService,
        { provide: StorageService, useValue: storageSpy },
        { provide: UserService, useValue: { user_: signal(null), isAdmin_: signal(false) } },
        { provide: UserMsgService, useValue: userMsgSpy },
        { provide: LoggingService, useValue: loggingSpy },
        { provide: TranslationService, useValue: translationSpy },
        { provide: KeyResolutionService, useValue: keyResolutionSpy }
      ]
    })

    service = TestBed.inject(UnitRegistryService)
    tick() // let the taxonomy load complete
  }))

  it('should be created and have initial units', () => {
    expect(service).toBeTruthy()
    const units = service.allUnitKeys_()
    expect(units).toContain('kg')
    expect(units).toContain('gram')
    expect(service.getConversion('kg')).toBe(1000)
    expect(service.getConversion('gram')).toBe(1)
  })

  describe('Registry Operations', () => {
    it('should register a new unit and update the allUnitKeys_ computed signal', fakeAsync(() => {
      service.registerUnit('sack', 25000)
      tick()
      expect(service.allUnitKeys_()).toContain('sack')
      expect(service.getConversion('sack')).toBe(25000)
    }))

    it('should not overwrite existing unit (shows message instead)', fakeAsync(() => {
      const rateBefore = service.getConversion('gram')
      service.registerUnit('gram', 2)
      tick()
      expect(service.getConversion('gram')).toBe(rateBefore)
    }))

    it('should not delete system units and should show error message', fakeAsync(() => {
      service.deleteUnit('gram')
      tick()
      expect(userMsgSpy.onSetErrorMsg).toHaveBeenCalledWith('לא ניתן למחוק יחידות בסיס')
      expect(service.allUnitKeys_()).toContain('gram')
    }))

    it('should return 1 as a fallback for unknown units', () => {
      expect(service.getConversion('UnknownUnit')).toBe(1)
    })
  })
})

// Plan 377 — editing a custom unit's key and conversion goes through the taxonomy term.
describe('UnitRegistryService — edit a custom unit', () => {
  let service: UnitRegistryService
  let storageSpy: jasmine.SpyObj<StorageService>
  let userMsgSpy: jasmine.SpyObj<Pick<UserMsgService, 'onSetSuccessMsg' | 'onSetErrorMsg'>>
  const jar = { _id: 't-jar', userId: 'u1', schemaVersion: 2, kind: 'unit', key: 'jar', gramRate: 500, sortOrder: 0 }

  beforeEach(fakeAsync(() => {
    storageSpy = fakeTermStorage([jar])
    storageSpy.put.and.callFake(<T>(_type: string, body: T) => Promise.resolve({ ...jar, ...body } as T))
    userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    TestBed.configureTestingModule({
      providers: [
        UnitRegistryService,
        { provide: StorageService, useValue: storageSpy },
        { provide: UserService, useValue: { user_: signal(null), isAdmin_: signal(false) } },
        { provide: UserMsgService, useValue: userMsgSpy },
        { provide: LoggingService, useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info']) },
        { provide: TranslationService, useValue: { translate: (k: string) => k } },
        {
          provide: KeyResolutionService,
          useValue: jasmine.createSpyObj('KeyResolutionService', ['ensureKeyForContext'])
        }
      ]
    })
    service = TestBed.inject(UnitRegistryService)
    tick()
  }))

  it('renames a custom unit: one term write with the new key, rate kept', fakeAsync(() => {
    let ok: boolean | undefined
    service.renameUnit('jar', ' Crate ').then((r) => (ok = r))
    tick()
    expect(ok).toBe(true)
    expect(storageSpy.put).toHaveBeenCalledOnceWith(
      'taxonomyTerms',
      jasmine.objectContaining({ key: 'crate', _id: 't-jar' })
    )
    expect(service.getConversion('crate')).toBe(500)
    expect(service.allUnitKeys_()).not.toContain('jar')
  }))

  it('refuses to rename a system unit, to an empty key, or to a key that exists', fakeAsync(() => {
    const results: boolean[] = []
    service.renameUnit('gram', 'grams').then((r) => results.push(r))
    service.renameUnit('jar', '  ').then((r) => results.push(r))
    service.renameUnit('jar', 'kg').then((r) => results.push(r))
    tick()
    expect(results).toEqual([false, false, false])
    expect(storageSpy.put).not.toHaveBeenCalled()
    expect(userMsgSpy.onSetErrorMsg).toHaveBeenCalledTimes(3)
  }))

  it('changes a custom unit conversion', fakeAsync(() => {
    let ok: boolean | undefined
    service.updateUnitRate('jar', 750).then((r) => (ok = r))
    tick()
    expect(ok).toBe(true)
    expect(storageSpy.put).toHaveBeenCalledOnceWith(
      'taxonomyTerms',
      jasmine.objectContaining({ gramRate: 750, _id: 't-jar' })
    )
    expect(service.getConversion('jar')).toBe(750)
  }))

  it('refuses a conversion of zero or less, and any conversion change on a system unit', fakeAsync(() => {
    const results: boolean[] = []
    service.updateUnitRate('jar', 0).then((r) => results.push(r))
    service.updateUnitRate('jar', -5).then((r) => results.push(r))
    service.updateUnitRate('kg', 900).then((r) => results.push(r))
    tick()
    expect(results).toEqual([false, false, false])
    expect(storageSpy.put).not.toHaveBeenCalled()
    expect(service.getConversion('kg')).toBe(1000)
  }))
})
