import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { FrontDeskProfileDataService } from './front-desk-profile-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import type { FrontDeskProfile } from '../models/front-desk-profile.model'

describe('FrontDeskProfileDataService', () => {
  let service: FrontDeskProfileDataService
  let storageSpy: jasmine.SpyObj<StorageService>

  const stored = {
    _id: 'p1',
    businessType: 'catering',
    slug: 'my-place',
    displayName: 'העסק',
    status: 'draft'
  } as unknown as FrontDeskProfile

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    storageSpy.query.and.returnValue(Promise.resolve([]))
    TestBed.configureTestingModule({
      providers: [
        FrontDeskProfileDataService,
        { provide: StorageService, useValue: storageSpy },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
        }
      ]
    })
    service = TestBed.inject(FrontDeskProfileDataService)
  })

  it('profile_ is null while the business has none', fakeAsync(() => {
    void service.ensureLoaded()
    tick()
    expect(service.profile_()).toBeNull()
  }))

  it('profile_ is the business one profile once loaded', fakeAsync(() => {
    storageSpy.query.and.returnValue(Promise.resolve([stored]))
    void service.ensureLoaded()
    tick()
    expect(service.profile_()?._id).toBe('p1')
  }))

  it('createFromTemplate posts the template of the type plus slug and displayName', fakeAsync(() => {
    storageSpy.post.and.returnValue(Promise.resolve(stored))
    let saved: FrontDeskProfile | undefined
    void service.createFromTemplate('catering', 'my-place', 'העסק').then((p) => (saved = p))
    tick()
    const [entity, body] = storageSpy.post.calls.mostRecent().args as [string, Record<string, unknown>]
    expect(entity).toBe('frontDeskProfiles')
    expect(body['businessType']).toBe('catering')
    expect(body['slug']).toBe('my-place')
    expect(body['displayName']).toBe('העסק')
    expect(body['status']).toBe('draft')
    expect(Object.keys(body['requestKinds'] as object).sort()).toEqual(['event', 'tasting'])
    expect(saved?._id).toBe('p1')
    expect(service.profile_()?._id).toBe('p1')
  }))
})
