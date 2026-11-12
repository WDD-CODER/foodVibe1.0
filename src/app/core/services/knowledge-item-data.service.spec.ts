import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { KnowledgeItemDataService } from './knowledge-item-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import { KnowledgeItem } from '../models/knowledge-item.model'

describe('KnowledgeItemDataService', () => {
  let service: KnowledgeItemDataService
  let http: HttpTestingController
  let storageSpy: jasmine.SpyObj<StorageService>

  const item = (_id: string, status: 'draft' | 'approved' = 'draft'): KnowledgeItem =>
    ({
      _id,
      topic: 'faq',
      question: 'q' + _id,
      answer: 'a',
      status,
      source: 'manual',
      visibility: 'public'
    }) as KnowledgeItem

  beforeEach(fakeAsync(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    storageSpy.query.and.returnValue(Promise.resolve([item('k1')]))
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        KnowledgeItemDataService,
        { provide: StorageService, useValue: storageSpy },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
        }
      ]
    })
    service = TestBed.inject(KnowledgeItemDataService)
    http = TestBed.inject(HttpTestingController)
    void service.ensureLoaded()
    tick()
  }))

  it('loads the items of the knowledgeItems entity only on ensureLoaded()', () => {
    expect(storageSpy.query).toHaveBeenCalledOnceWith('knowledgeItems')
    expect(service.allItems_().length).toBe(1)
  })

  it('approve() puts the ids in one request and reloads', fakeAsync(() => {
    let result = -1
    void service.approve(['k1', 'k2']).then((n) => (result = n))
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/knowledge/approve'))
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual({ ids: ['k1', 'k2'] })
    req.flush({ approved: 2 })
    tick()
    expect(result).toBe(2)
    expect(storageSpy.query).toHaveBeenCalledTimes(2)
  }))

  it('importDrafts() posts the text and answers the counts', fakeAsync(() => {
    let result: { created: number; dropped: number } | undefined
    void service.importDrafts({ text: 'hello' }).then((r) => (result = r))
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/ai/knowledge-import'))
    expect(req.request.body).toEqual({ text: 'hello' })
    req.flush({ items: [item('a'), item('b')], dropped: 3 })
    tick()
    expect(result).toEqual({ created: 2, dropped: 3 })
  }))

  it('addItem() stores through the storage service and adds it to the list', fakeAsync(() => {
    storageSpy.post.and.callFake(((_e: string, body: object) => Promise.resolve({ ...body, _id: 'new' })) as never)
    void service.addItem({
      topic: 'policy',
      question: 'q',
      answer: 'a',
      status: 'approved',
      source: 'manual',
      visibility: 'public'
    } as Omit<KnowledgeItem, '_id'>)
    tick()
    expect(service.allItems_().map((i) => i._id)).toEqual(['k1', 'new'])
  }))
})
