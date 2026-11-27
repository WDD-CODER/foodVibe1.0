import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import type { Business } from '@schemas/entities'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { MenuDesign, NewMenuDesign } from '../models/menu-design.model'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { LoadingService } from './loading.service'
import { BusinessService } from './business.service'
import { TranslationService } from './translation.service'
import { MenuDesignDataService, menuDesignsEnsureLoadedResolver } from './menu-design-data.service'

const ENTITY = 'menuDesigns'

function design(_id: string, name: string): MenuDesign {
  return {
    ...baseDesign('classic'),
    _id,
    name,
    schemaVersion: 2,
    businessId: 'b1',
    createdBy: 'u1',
    createdAt: 1,
    updatedAt: 1
  }
}

describe('MenuDesignDataService', () => {
  let service: MenuDesignDataService
  let storageSpy: jasmine.SpyObj<StorageService>
  let loggingSpy: jasmine.SpyObj<LoggingService>
  const business = signal<Business | null>(null)

  const withDefault = (defaultDesignId: string): Business =>
    ({ _id: 'b1', menuDesign: { defaultDesignId, hidePoweredBy: false } }) as Business

  beforeEach(async () => {
    business.set(null)
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    loggingSpy = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
    storageSpy.query.and.returnValue(Promise.resolve([design('d1', 'ערב'), design('d2', 'צהריים')]))

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: storageSpy },
        { provide: LoggingService, useValue: loggingSpy },
        { provide: LoadingService, useValue: { track: <T>(work: Promise<T>) => work } },
        { provide: BusinessService, useValue: { business_: business.asReadonly() } },
        { provide: TranslationService, useValue: { translate: () => '(עותק)' } }
      ]
    })

    service = TestBed.inject(MenuDesignDataService)
  })

  it('fetches nothing until ensureLoaded(), then loads the menuDesigns list once', async () => {
    expect(storageSpy.query).not.toHaveBeenCalled()
    await service.ensureLoaded()
    await service.ensureLoaded()
    expect(storageSpy.query).toHaveBeenCalledOnceWith(ENTITY)
    expect(service.allDesigns_().map((d) => d._id)).toEqual(['d1', 'd2'])
  })

  it('getDesignById reads one design from storage', async () => {
    storageSpy.get.and.returnValue(Promise.resolve(design('d2', 'צהריים')))
    expect((await service.getDesignById('d2')).name).toBe('צהריים')
    expect(storageSpy.get).toHaveBeenCalledWith(ENTITY, 'd2')
  })

  it('addDesign posts and appends the saved design', async () => {
    await service.ensureLoaded()
    storageSpy.post.and.returnValue(Promise.resolve(design('d3', 'חדש')))
    const draft: NewMenuDesign = { ...baseDesign('modern'), name: 'חדש' }
    const saved = await service.addDesign(draft)
    expect(saved._id).toBe('d3')
    expect(storageSpy.post).toHaveBeenCalledWith(ENTITY, jasmine.objectContaining({ name: 'חדש' }))
    expect(service.allDesigns_().length).toBe(3)
  })

  it('updateDesign replaces the design in the list', async () => {
    await service.ensureLoaded()
    storageSpy.put.and.returnValue(Promise.resolve(design('d1', 'אחר')))
    await service.updateDesign(design('d1', 'אחר'))
    expect(service.allDesigns_().map((d) => d.name)).toEqual(['אחר', 'צהריים'])
  })

  it('deleteDesign removes the design from the list', async () => {
    await service.ensureLoaded()
    storageSpy.remove.and.returnValue(Promise.resolve())
    await service.deleteDesign('d1')
    expect(storageSpy.remove).toHaveBeenCalledWith(ENTITY, 'd1')
    expect(service.allDesigns_().map((d) => d._id)).toEqual(['d2'])
  })

  it('a failed save keeps the list, logs and rejects', async () => {
    await service.ensureLoaded()
    storageSpy.put.and.returnValue(Promise.reject(new Error('boom')))
    await expectAsync(service.updateDesign(design('d1', 'אחר'))).toBeRejected()
    expect(service.allDesigns_()[0].name).toBe('ערב')
    expect(loggingSpy.error).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'crud.menu_design.update_error' }))
  })

  it('a 401 rejects without logging an error', async () => {
    storageSpy.remove.and.returnValue(Promise.reject(new HttpErrorResponse({ status: 401 })))
    await expectAsync(service.deleteDesign('d1')).toBeRejected()
    expect(loggingSpy.error).not.toHaveBeenCalled()
  })

  it('a failed load is remembered, logged and tried again by the next ensureLoaded()', async () => {
    storageSpy.query.and.returnValue(Promise.reject(new Error('down')))
    await service.ensureLoaded()
    expect(service.loadFailed_()).toBeTrue()
    expect(service.hasLoaded()).toBeFalse()
    expect(loggingSpy.error).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'crud.menu_design.load_error' }))

    storageSpy.query.and.returnValue(Promise.resolve([design('d1', 'ערב')]))
    await service.ensureLoaded()
    expect(service.loadFailed_()).toBeFalse()
    expect(service.allDesigns_().length).toBe(1)
  })

  it('reloadFromStorage reads the list again', async () => {
    await service.ensureLoaded()
    await service.reloadFromStorage()
    expect(storageSpy.query).toHaveBeenCalledTimes(2)
  })

  it('the route resolver loads the designs and answers true', async () => {
    const answer = await TestBed.runInInjectionContext(
      () => menuDesignsEnsureLoadedResolver({} as never, {} as never) as Promise<boolean>
    )
    expect(answer).toBeTrue()
    expect(service.allDesigns_().length).toBe(2)
  })

  it('duplicateDesign is one create with the copy mark added to the name', async () => {
    await service.ensureLoaded()
    storageSpy.post.and.returnValue(Promise.resolve(design('d3', 'ערב (עותק)')))
    await service.duplicateDesign('d1')
    expect(storageSpy.post.calls.count()).toBe(1)
    expect(storageSpy.post.calls.mostRecent().args[1] as unknown).toEqual({
      ...baseDesign('classic'),
      name: 'ערב (עותק)'
    })
    expect(storageSpy.put).not.toHaveBeenCalled()
    expect(service.allDesigns_().length).toBe(3)
  })

  it('duplicateDesign cuts a long name to 60 characters and keeps the copy mark', async () => {
    storageSpy.query.and.returnValue(Promise.resolve([design('d1', 'א'.repeat(60))]))
    await service.ensureLoaded()
    storageSpy.post.and.returnValue(Promise.resolve(design('d3', 'עותק')))
    await service.duplicateDesign('d1')
    const sent = storageSpy.post.calls.mostRecent().args[1] as unknown as NewMenuDesign
    expect(sent.name.length).toBe(60)
    expect(sent.name.endsWith(' (עותק)')).toBeTrue()
  })

  describe('defaultDesign_', () => {
    const older: MenuDesign = { ...design('d1', 'ישן'), createdAt: 1 }
    const newer: MenuDesign = { ...design('d2', 'חדש'), createdAt: 2 }

    beforeEach(() => storageSpy.query.and.returnValue(Promise.resolve([newer, older])))

    it('is the business default while that design is live', async () => {
      business.set(withDefault('d2'))
      await service.ensureLoaded()
      expect(service.defaultDesign_()?._id).toBe('d2')
    })

    it('falls back to the first live design by createdAt', async () => {
      business.set(withDefault('gone'))
      await service.ensureLoaded()
      expect(service.defaultDesign_()?._id).toBe('d1')
    })

    it('skips a deleted design', async () => {
      storageSpy.query.and.returnValue(Promise.resolve([newer, { ...older, deletedAt: 5 }]))
      business.set(withDefault('d1'))
      await service.ensureLoaded()
      expect(service.defaultDesign_()?._id).toBe('d2')
    })

    it('is null when there is no design', async () => {
      storageSpy.query.and.returnValue(Promise.resolve([]))
      await service.ensureLoaded()
      expect(service.defaultDesign_()).toBeNull()
    })
  })
})
