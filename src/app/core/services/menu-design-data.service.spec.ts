import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { MenuDesign, NewMenuDesign } from '../models/menu-design.model'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { LoadingService } from './loading.service'
import { MenuDesignDataService } from './menu-design-data.service'

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

  beforeEach(async () => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    loggingSpy = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
    storageSpy.query.and.returnValue(Promise.resolve([design('d1', 'ערב'), design('d2', 'צהריים')]))

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: storageSpy },
        { provide: LoggingService, useValue: loggingSpy },
        { provide: LoadingService, useValue: { track: <T>(work: Promise<T>) => work } }
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
})
