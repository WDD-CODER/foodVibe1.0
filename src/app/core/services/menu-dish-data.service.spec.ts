import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { MenuDishDataService } from './menu-dish-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import type { MenuDish } from '../models/menu-dish.model'

describe('MenuDishDataService', () => {
  let service: MenuDishDataService
  let storageSpy: jasmine.SpyObj<StorageService>

  const dish = (_id: string): MenuDish => ({ _id, name: 'd' + _id, costSource: 'units', active: true }) as MenuDish

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    TestBed.configureTestingModule({
      providers: [
        MenuDishDataService,
        { provide: StorageService, useValue: storageSpy },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
        }
      ]
    })
    service = TestBed.inject(MenuDishDataService)
  })

  it('does not load until load() is called, then reads menuDishes', fakeAsync(() => {
    expect(storageSpy.query).not.toHaveBeenCalled()
    storageSpy.query.and.returnValue(Promise.resolve([dish('a')]))
    void service.load()
    tick()
    expect(storageSpy.query).toHaveBeenCalledOnceWith('menuDishes')
    expect(service.allDishes_().length).toBe(1)
    expect(service.loadFailed_()).toBeFalse()
  }))

  it('a failed load sets loadFailed_ and a retry clears it', fakeAsync(() => {
    storageSpy.query.and.returnValue(Promise.reject(new Error('down')))
    void service.load()
    tick()
    expect(service.loadFailed_()).toBeTrue()
    storageSpy.query.and.returnValue(Promise.resolve([dish('a')]))
    void service.load()
    tick()
    expect(service.loadFailed_()).toBeFalse()
    expect(service.allDishes_().length).toBe(1)
  }))

  it('addDish() posts and adds to the list; updateDish() replaces by id', fakeAsync(() => {
    storageSpy.query.and.returnValue(Promise.resolve([dish('a')]))
    void service.load()
    tick()
    storageSpy.post.and.callFake(((_e: string, body: object) => Promise.resolve({ ...body, _id: 'new' })) as never)
    void service.addDish({ name: 'x', costSource: 'units', active: true } as Omit<MenuDish, '_id'>)
    tick()
    expect(service.allDishes_().map((d) => d._id)).toEqual(['a', 'new'])
    storageSpy.put.and.callFake(((_e: string, body: object) => Promise.resolve(body)) as never)
    void service.updateDish({ ...dish('a'), active: false })
    tick()
    expect(service.allDishes_().find((d) => d._id === 'a')?.active).toBeFalse()
  }))
})
