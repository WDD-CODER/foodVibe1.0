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

  it('an update of the same _id triggers no second GET', () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http.expectOne(URL).flush({ _id: 'b1', name: 'x' })
    user.set({ _id: 'u1', name: 'renamed', email: 'u@x' })
    TestBed.flushEffects()
    http.expectNone(URL)
    expect(service.business_()).not.toBeNull()
  })

  it('a late reply after sign-out does not overwrite null', () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    const req = http.expectOne(URL)
    user.set(null)
    TestBed.flushEffects()
    req.flush({ _id: 'b1', name: 'x' })
    expect(service.business_()).toBeNull()
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

  it('updateSettings PUTs the numbers and puts the stored settings into business_', async () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http
      .expectOne(URL)
      .flush({ _id: 'b1', name: 'x', settings: { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 } })
    const next = { profitTargetPct: 30, safetyMarginPct: 12.5, overrunThresholdPct: 15 }
    const done = service.updateSettings(next)
    const req = http.expectOne(`${URL}/settings`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual(next)
    req.flush({ settings: next })
    await done
    expect(service.business_()?.settings).toEqual(next)
  })

  it('updateSettings rejects on a refusal and leaves business_ unchanged', async () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http.expectOne(URL).flush({ _id: 'b1', name: 'x' })
    const done = service.updateSettings({ profitTargetPct: 100, safetyMarginPct: 10, overrunThresholdPct: 10 })
    http.expectOne(`${URL}/settings`).flush({ error: 'Validation failed' }, { status: 400, statusText: 'Bad Request' })
    await expectAsync(done).toBeRejected()
    expect(service.business_()?.settings).toBeUndefined()
  })

  it('updateBaseline PUTs the filled fields and puts the returned baseline into business_', async () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http.expectOne(URL).flush({ _id: 'b1', name: 'x' })
    const done = service.updateBaseline({ eventsClosedPerMonth: 4 })
    const req = http.expectOne(`${URL}/baseline`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual({ eventsClosedPerMonth: 4 })
    req.flush({ baseline: { eventsClosedPerMonth: 4, filledAt: 123 } })
    await done
    expect(service.business_()?.baseline).toEqual({ eventsClosedPerMonth: 4, filledAt: 123 })
  })

  it('updateBaseline rejects on a refusal and leaves business_ unchanged', async () => {
    user.set({ _id: 'u1', name: 'u', email: 'u@x' })
    TestBed.flushEffects()
    http.expectOne(URL).flush({ _id: 'b1', name: 'x' })
    const done = service.updateBaseline({ estProfitPct: 100 })
    http.expectOne(`${URL}/baseline`).flush({ error: 'Validation failed' }, { status: 400, statusText: 'Bad Request' })
    await expectAsync(done).toBeRejected()
    expect(service.business_()?.baseline).toBeUndefined()
  })

  it('loadSetupStatus GETs the counts', async () => {
    const done = service.loadSetupStatus()
    const req = http.expectOne(`${URL}/setup-status`)
    expect(req.request.method).toBe('GET')
    req.flush({ pricedProducts: 3, suppliers: 1, recipes: 0, events: 0, staff: 0 })
    expect((await done).pricedProducts).toBe(3)
  })
})
