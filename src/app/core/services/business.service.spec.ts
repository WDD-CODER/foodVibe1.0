import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { BusinessService } from './business.service'
import { UserService } from './user.service'
import { LoggingService } from './logging.service'
import { environment } from '../../../environments/environment'
import type { User } from '../models/user.model'

const URL = `${environment.apiUrl}/api/v1/business`

describe('BusinessService', () => {
  let service: BusinessService
  let http: HttpTestingController
  const user = signal<User | null>(null)

  beforeEach(() => {
    user.set(null)
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { user_: user } },
        { provide: LoggingService, useValue: jasmine.createSpyObj<LoggingService>('LoggingService', ['warn']) }
      ]
    })
    service = TestBed.inject(BusinessService)
    http = TestBed.inject(HttpTestingController)
  })

  it('a signed-in user triggers one GET and business_() holds the reply', () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    const req = http.expectOne(URL)
    expect(req.request.method).toBe('GET')
    req.flush({ _id: 'b1', name: 'מטבח בדיקה' })
    expect(service.business_()).toEqual(jasmine.objectContaining({ _id: 'b1', name: 'מטבח בדיקה' }))
    TestBed.flushEffects()
    http.expectNone(URL)
  })

  it('sign-out clears business_()', () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http.expectOne(URL).flush({ _id: 'b1', name: 'x' })
    user.set(null)
    TestBed.flushEffects()
    expect(service.business_()).toBeNull()
  })

  it('a 404 leaves it null without throwing', () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http.expectOne(URL).flush({ error: 'Business not found' }, { status: 404, statusText: 'Not Found' })
    expect(service.business_()).toBeNull()
  })
})
