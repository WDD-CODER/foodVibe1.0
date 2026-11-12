import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ClientDataService } from './client-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { UserMsgService } from './user-msg.service'
import { TranslationService } from './translation.service'
import { Client } from '../models/client.model'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { MenuEventDataService } from './menu-event-data.service'
import { RequestDataService } from './request-data.service'
import { BookingDataService } from './booking-data.service'

describe('ClientDataService', () => {
  let service: ClientDataService
  let storageSpy: jasmine.SpyObj<StorageService>
  let loggingSpy: jasmine.SpyObj<LoggingService>
  let userMsgSpy: jasmine.SpyObj<UserMsgService>

  const ENTITY = 'clients'

  const mockClients: Client[] = [
    { _id: 'c1', name: 'Dana', phone: '052-1234567', phoneNormalized: '0521234567', clientType: 'private' },
    { _id: 'c2', name: 'Avi', phone: '054-7770000', phoneNormalized: '0547770000', clientType: 'business' }
  ]

  beforeEach(fakeAsync(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    loggingSpy = jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
    userMsgSpy = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    storageSpy.query.and.returnValue(Promise.resolve(mockClients))

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ClientDataService,
        { provide: StorageService, useValue: storageSpy },
        { provide: LoggingService, useValue: loggingSpy },
        { provide: UserMsgService, useValue: userMsgSpy },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })

    service = TestBed.inject(ClientDataService)
    void service.ensureLoaded()
    tick()
  }))

  it('loads clients only on ensureLoaded() and only once', fakeAsync(() => {
    expect(storageSpy.query).toHaveBeenCalledOnceWith(ENTITY)
    expect(service.allClients_().length).toBe(2)
    void service.ensureLoaded()
    tick()
    expect(storageSpy.query).toHaveBeenCalledTimes(1)
  }))

  it('does not fetch in the constructor (deferred load)', () => {
    storageSpy.query.calls.reset()
    TestBed.runInInjectionContext(() => new ClientDataService())
    expect(storageSpy.query).not.toHaveBeenCalled()
  })

  it('getClientById reads the loaded list without a request', () => {
    expect(service.getClientById('c2')?.name).toBe('Avi')
    expect(service.getClientById('missing')).toBeUndefined()
    expect(storageSpy.get).not.toHaveBeenCalled()
  })

  describe('addClient', () => {
    it('posts and appends the saved client', fakeAsync(() => {
      const saved: Client = { _id: 'c3', name: 'Noa', phone: '050-1112222', phoneNormalized: '0501112222' }
      storageSpy.post.and.returnValue(Promise.resolve(saved))
      let result: Client | undefined
      service.addClient({ name: 'Noa', phone: '050-1112222' }).then((r) => (result = r))
      tick()
      expect(storageSpy.post).toHaveBeenCalledWith(ENTITY, jasmine.objectContaining({ name: 'Noa' }))
      expect(result).toEqual(saved)
      expect(service.allClients_().length).toBe(3)
    }))

    it('an existing phone keeps one list entry, replaces it and shows the info toast', fakeAsync(() => {
      const existing: Client = { ...mockClients[0], name: 'Dana (saved)' }
      storageSpy.post.and.returnValue(Promise.resolve(existing))
      let result: Client | undefined
      service.addClient({ name: 'Other', phone: '+972 52 123 4567' }).then((r) => (result = r))
      tick()
      expect(result).toEqual(existing)
      expect(service.allClients_().length).toBe(2)
      expect(service.getClientById('c1')?.name).toBe('Dana (saved)')
      expect(userMsgSpy.onSetSuccessMsg).toHaveBeenCalledOnceWith('client_existing_selected')
    }))

    it('a new client shows no toast', fakeAsync(() => {
      storageSpy.post.and.returnValue(
        Promise.resolve({ _id: 'c9', name: 'Noa', phone: '050-1112222', phoneNormalized: '0501112222' })
      )
      service.addClient({ name: 'Noa', phone: '050-1112222' })
      tick()
      expect(userMsgSpy.onSetSuccessMsg).not.toHaveBeenCalled()
    }))

    it('re-throws a 401 without logging', fakeAsync(() => {
      const err = new HttpErrorResponse({ status: 401 })
      storageSpy.post.and.returnValue(Promise.reject(err))
      let caught: unknown
      service.addClient({ name: 'Noa', phone: '050-1112222' }).catch((e) => (caught = e))
      tick()
      expect(caught).toBe(err)
      expect(loggingSpy.error).not.toHaveBeenCalled()
      expect(service.allClients_().length).toBe(2)
    }))

    it('logs crud.client.create_error and re-throws other errors', fakeAsync(() => {
      const err = new HttpErrorResponse({ status: 500 })
      storageSpy.post.and.returnValue(Promise.reject(err))
      let caught: unknown
      service.addClient({ name: 'Noa', phone: '050-1112222' }).catch((e) => (caught = e))
      tick()
      expect(caught).toBe(err)
      expect(loggingSpy.error).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'crud.client.create_error' }))
    }))
  })

  describe('updateClient', () => {
    it('puts and replaces the client in the list', fakeAsync(() => {
      const updated: Client = { ...mockClients[0], name: 'Dana Levi' }
      storageSpy.put.and.returnValue(Promise.resolve(updated))
      service.updateClient(updated)
      tick()
      expect(storageSpy.put).toHaveBeenCalledWith(ENTITY, updated)
      expect(service.getClientById('c1')?.name).toBe('Dana Levi')
      expect(service.allClients_().length).toBe(2)
    }))

    it('re-throws a 401 without logging', fakeAsync(() => {
      const err = new HttpErrorResponse({ status: 401 })
      storageSpy.put.and.returnValue(Promise.reject(err))
      let caught: unknown
      service.updateClient(mockClients[0]).catch((e) => (caught = e))
      tick()
      expect(caught).toBe(err)
      expect(loggingSpy.error).not.toHaveBeenCalled()
    }))

    it('logs crud.client.update_error and re-throws other errors', fakeAsync(() => {
      const err = new Error('boom')
      storageSpy.put.and.returnValue(Promise.reject(err))
      let caught: unknown
      service.updateClient(mockClients[0]).catch((e) => (caught = e))
      tick()
      expect(caught).toBe(err)
      expect(loggingSpy.error).toHaveBeenCalledWith(jasmine.objectContaining({ event: 'crud.client.update_error' }))
      expect(service.getClientById('c1')?.name).toBe('Dana')
    }))
  })

  describe('mergeClient', () => {
    it('posts once, drops the merged client, replaces the target and reloads events, requests and bookings', fakeAsync(() => {
      const http = TestBed.inject(HttpTestingController)
      const reloads = [MenuEventDataService, RequestDataService, BookingDataService].map((token) => {
        const svc = TestBed.inject(token as never) as { reloadFromStorage: () => Promise<void> }
        return spyOn(svc, 'reloadFromStorage').and.returnValue(Promise.resolve())
      })
      const target: Client = { ...mockClients[1], name: 'Avi merged' }
      let result: Client | undefined
      service.mergeClient('c1', 'c2').then((r) => (result = r))
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/clients/c1/merge'))
      expect(req.request.method).toBe('POST')
      expect(req.request.body).toEqual({ intoId: 'c2' })
      req.flush({ ok: true, client: target })
      tick()
      expect(result).toEqual(target)
      expect(service.getClientById('c1')).toBeUndefined()
      expect(service.getClientById('c2')?.name).toBe('Avi merged')
      reloads.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1))
      http.verify()
    }))

    it('re-throws a refusal and keeps the list', fakeAsync(() => {
      const http = TestBed.inject(HttpTestingController)
      let caught: unknown
      service.mergeClient('c1', 'c2').catch((e) => (caught = e))
      http
        .expectOne((r) => r.url.endsWith('/api/v1/clients/c1/merge'))
        .flush({ error: 'ALREADY_MERGED' }, { status: 409, statusText: 'Conflict' })
      tick()
      expect((caught as HttpErrorResponse).status).toBe(409)
      expect(service.allClients_().length).toBe(2)
    }))
  })

  describe('setDoNotContact', () => {
    it('puts the flag with its reason and keeps the answer in the list', fakeAsync(() => {
      const http = TestBed.inject(HttpTestingController)
      service.setDoNotContact('c1', true, 'asked')
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/clients/c1/do-not-contact'))
      expect(req.request.method).toBe('PUT')
      expect(req.request.body).toEqual({ on: true, reason: 'asked' })
      req.flush({ ...mockClients[0], doNotContact: { at: 1, reason: 'asked', via: 'member' } })
      tick()
      expect(service.getClientById('c1')?.doNotContact?.reason).toBe('asked')
    }))

    it('sends only { on: false } to clear it', fakeAsync(() => {
      const http = TestBed.inject(HttpTestingController)
      service.setDoNotContact('c1', false)
      const req = http.expectOne((r) => r.url.endsWith('/do-not-contact'))
      expect(req.request.body).toEqual({ on: false })
      req.flush(mockClients[0])
      tick()
    }))
  })
})
