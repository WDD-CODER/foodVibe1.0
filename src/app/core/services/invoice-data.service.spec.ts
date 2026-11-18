import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { InvoiceDataService } from './invoice-data.service'
import { environment } from '../../../environments/environment'

describe('InvoiceDataService', () => {
  const FILE_URL = `${environment.authApiUrl}/api/v1/files/f1`
  let service: InvoiceDataService
  let http: HttpTestingController
  let query: jasmine.Spy
  let logging: jasmine.SpyObj<LoggingService>
  let tab: { opener: unknown; location: { replace: jasmine.Spy }; close: jasmine.Spy }

  beforeEach(() => {
    query = jasmine.createSpy('query').and.resolveTo([{ _id: 'i1' }])
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['error', 'info'])
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: { query } },
        { provide: LoggingService, useValue: logging }
      ]
    })
    service = TestBed.inject(InvoiceDataService)
    http = TestBed.inject(HttpTestingController)
    tab = { opener: 'x', location: { replace: jasmine.createSpy('replace') }, close: jasmine.createSpy('close') }
    spyOn(window, 'open').and.returnValue(tab as unknown as Window)
  })

  afterEach(() => http.verify())

  it('does not load by itself and reloads on demand', async () => {
    expect(query).not.toHaveBeenCalled()
    await service.reloadFromStorage()
    expect(query).toHaveBeenCalledWith('invoices')
    expect(service.allInvoices_().length).toBe(1)
  })

  it('opens the tab at once, then points it at the signed link with no opener', async () => {
    const result = service.openFile('f1')
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    http.expectOne(FILE_URL).flush({ url: 'https://files.example/x' })
    expect(await result).toBeTrue()
    expect(tab.opener).toBeNull()
    expect(tab.location.replace).toHaveBeenCalledWith('https://files.example/x')
  })

  it('closes the tab, logs the status only and returns false on a failure', async () => {
    const result = service.openFile('f1')
    http.expectOne(FILE_URL).flush({ error: 'FILE_STORE_OFF' }, { status: 503, statusText: 'Unavailable' })
    expect(await result).toBeFalse()
    expect(tab.close).toHaveBeenCalled()
    const logged = logging.error.calls.mostRecent().args[0]
    expect(logged.event).toBe('invoices.file_open_failed')
    expect(logged.context).toEqual({ status: 503 })
  })
})
