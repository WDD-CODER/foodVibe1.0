import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
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
        provideHttpClient(),
        provideHttpClientTesting(),
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

  describe('setConfirmMode', () => {
    let http: HttpTestingController
    beforeEach(fakeAsync(() => {
      http = TestBed.inject(HttpTestingController)
      storageSpy.query.and.returnValue(Promise.resolve([stored]))
      void service.ensureLoaded()
      tick()
    }))

    it('sends one PUT and puts the mode into profile_', fakeAsync(() => {
      let ok: boolean | undefined
      void service.setConfirmMode('auto').then((r) => (ok = r))
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/floor-plan/confirm-mode'))
      expect(req.request.method).toBe('PUT')
      expect(req.request.body).toEqual({ confirmMode: 'auto' })
      req.flush({ confirmMode: 'auto' })
      tick()
      expect(ok).toBeTrue()
      expect(service.profile_()?.tableService?.confirmMode).toBe('auto')
      http.verify()
    }))

    it('a failed call leaves profile_ unchanged and returns false', fakeAsync(() => {
      let ok: boolean | undefined
      void service.setConfirmMode('auto').then((r) => (ok = r))
      http
        .expectOne((r) => r.url.endsWith('/api/v1/floor-plan/confirm-mode'))
        .flush({}, { status: 500, statusText: 'x' })
      tick()
      expect(ok).toBeFalse()
      expect(service.profile_()).toEqual(stored)
    }))
  })

  describe('setAssistantLevel (plan 734)', () => {
    let http: HttpTestingController
    const URL = '/api/v1/business/front-desk/assistant-level'
    beforeEach(fakeAsync(() => {
      http = TestBed.inject(HttpTestingController)
      storageSpy.query.and.returnValue(
        Promise.resolve([{ ...stored, assistant: { level: 0, tone: 'warm' } } as unknown as FrontDeskProfile])
      )
      void service.ensureLoaded()
      tick()
    }))

    it('sends one PUT and puts the level into profile_', fakeAsync(() => {
      let res: { ok: boolean } | undefined
      void service.setAssistantLevel(1).then((r) => (res = r))
      const req = http.expectOne((r) => r.url.endsWith(URL))
      expect(req.request.method).toBe('PUT')
      expect(req.request.body).toEqual({ level: 1 })
      req.flush({ level: 1 })
      tick()
      expect(res).toEqual({ ok: true })
      expect(service.profile_()?.assistant.level).toBe(1)
      http.verify()
    }))

    it('a failed call leaves profile_ unchanged and answers the server error code', fakeAsync(() => {
      let res: { ok: boolean; code?: string } | undefined
      void service.setAssistantLevel(1).then((r) => (res = r))
      http.expectOne((r) => r.url.endsWith(URL)).flush({ error: 'LEVEL_LOCKED' }, { status: 409, statusText: 'x' })
      tick()
      expect(res).toEqual({ ok: false, code: 'LEVEL_LOCKED' })
      expect(service.profile_()?.assistant.level).toBe(0)
    }))

    it('answers "error" when the server sends no code', fakeAsync(() => {
      let res: { ok: boolean; code?: string } | undefined
      void service.setAssistantLevel(0).then((r) => (res = r))
      http.expectOne((r) => r.url.endsWith(URL)).flush(null, { status: 500, statusText: 'x' })
      tick()
      expect(res).toEqual({ ok: false, code: 'error' })
    }))
  })
})
