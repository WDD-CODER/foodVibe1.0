import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { LoggingService } from '@services/logging.service'
import { AssistantRunDataService } from '@services/assistant-run-data.service'
import { AssistantEngineService } from './assistant-engine.service'

describe('AssistantEngineService (plan 760)', () => {
  let service: AssistantEngineService
  let http: HttpTestingController
  let loadSetup: jasmine.Spy
  let logging: jasmine.SpyObj<LoggingService>

  beforeEach(() => {
    loadSetup = jasmine.createSpy('loadSetup').and.resolveTo()
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error'])
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LoggingService, useValue: logging },
        { provide: AssistantRunDataService, useValue: { loadSetup } }
      ]
    })
    service = TestBed.inject(AssistantEngineService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  const request = () => http.expectOne((r) => r.url.endsWith('/assistant-runs/engine-settings'))

  it('puts one number and reads the setup again', async () => {
    const done = service.save('quietMs', 4000)
    const sent = request()
    expect(sent.request.method).toBe('PUT')
    expect(sent.request.body).toEqual({ field: 'quietMs', value: 4000 })
    sent.flush({})
    expect(await done).toBe('saved')
    expect(loadSetup).toHaveBeenCalledOnceWith(true)
  })

  it('says a value was refused, and keeps the setup as it is', async () => {
    const done = service.save('quietMs', 1)
    request().flush({ error: 'OUT_OF_RANGE' }, { status: 400, statusText: 'Bad Request' })
    expect(await done).toBe('out_of_range')
    expect(loadSetup).not.toHaveBeenCalled()
    expect(logging.warn).toHaveBeenCalledTimes(1)
  })

  it('says the save failed when the server does not answer', async () => {
    const done = service.save('quietMs', 4000)
    request().error(new ProgressEvent('error'))
    expect(await done).toBe('failed')
    expect(loadSetup).not.toHaveBeenCalled()
    expect(logging.error).toHaveBeenCalledTimes(1)
  })
})
