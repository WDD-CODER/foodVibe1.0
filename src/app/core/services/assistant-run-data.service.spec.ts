import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { AssistantRunDataService } from './assistant-run-data.service'
import { LoggingService } from './logging.service'
import type { AssistantRunRow } from '@models/assistant-run.model'

const row = (id: string, startedAt: number): AssistantRunRow => ({
  _id: id,
  conversationId: 'c1',
  mode: 'turn',
  startedAt,
  ms: 10,
  outcome: 'answered',
  fallbackUsed: false,
  text: 'hi'
})

describe('AssistantRunDataService (plan 752)', () => {
  let service: AssistantRunDataService
  let http: HttpTestingController
  const logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error'])
  const listCall = () => http.expectOne((r) => r.url.endsWith('/api/v1/assistant-runs'))
  const oneCall = (id: string) => http.expectOne((r) => r.url.endsWith(`/api/v1/assistant-runs/${id}`))

  beforeEach(() => {
    logging.warn.calls.reset()
    logging.error.calls.reset()
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LoggingService, useValue: logging }]
    })
    service = TestBed.inject(AssistantRunDataService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  async function loadList(rows = [row('a', 20), row('b', 10)], more = true) {
    const p = service.list({ filter: 'all', test: false })
    listCall().flush({ runs: rows, more })
    await p
  }

  it('list() sends the filter and the scope and fills runs_ and more_', async () => {
    expect(service.listLoaded_()).toBeFalse()
    const p = service.list({ filter: 'handover', test: true })
    const req = listCall()
    expect(req.request.params.get('filter')).toBe('handover')
    expect(req.request.params.get('scope')).toBe('test')
    expect(req.request.params.has('before')).toBeFalse()
    req.flush({ runs: [row('a', 20)], more: true })
    await p
    expect(service.runs_().map((r) => r._id)).toEqual(['a'])
    expect(service.more_()).toBeTrue()
    expect(service.listLoaded_()).toBeTrue()
    expect(service.listFailed_()).toBeFalse()
  })

  it('a failed list sets listFailed_, keeps the old rows and logs the status only', async () => {
    await loadList()
    const p = service.list({ filter: 'all', test: false })
    listCall().flush('x', { status: 500, statusText: 'Server error' })
    await p
    expect(service.listFailed_()).toBeTrue()
    expect(service.runs_().length).toBe(2)
    expect(logging.error).toHaveBeenCalledOnceWith({
      event: 'assistant_runs.list.failed',
      message: 'Assistant runs call failed',
      context: { status: '500' }
    })
  })

  it('loadMore() asks before the last row, with the same filter, and appends', async () => {
    await loadList()
    const p = service.loadMore()
    expect(service.loadingMore_()).toBeTrue()
    const req = listCall()
    expect(req.request.params.get('before')).toBe('10')
    expect(req.request.params.get('scope')).toBe('real')
    req.flush({ runs: [row('c', 5)], more: false })
    await p
    expect(service.runs_().map((r) => r._id)).toEqual(['a', 'b', 'c'])
    expect(service.more_()).toBeFalse()
    expect(service.loadingMore_()).toBeFalse()
  })

  it('open() fills run_; closeRun() clears it', async () => {
    const p = service.open('r1')
    expect(service.runLoading_()).toBeTrue()
    oneCall('r1').flush({ run: { _id: 'r1' } })
    await p
    expect(service.run_()?._id).toBe('r1')
    expect(service.runLoading_()).toBeFalse()
    service.closeRun()
    expect(service.run_()).toBeNull()
  })

  it('open(): a 404 is not_found, another failure is failed', async () => {
    const missing = service.open('r1')
    oneCall('r1').flush('x', { status: 404, statusText: 'Not found' })
    await missing
    expect(service.runFailed_()).toBe('not_found')
    expect(logging.warn).toHaveBeenCalledTimes(1)
    const broken = service.open('r2')
    oneCall('r2').flush('x', { status: 503, statusText: 'Unavailable' })
    await broken
    expect(service.runFailed_()).toBe('failed')
    expect(service.runLoading_()).toBeFalse()
  })
})
