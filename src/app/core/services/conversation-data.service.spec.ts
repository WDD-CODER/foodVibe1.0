import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ConversationDataService } from './conversation-data.service'
import { LoggingService } from './logging.service'
import type { Conversation, ConversationRow, Message } from '@models/conversation.model'

const conv = (id: string, over: Partial<Conversation> = {}): Conversation =>
  ({
    _id: id,
    businessId: 'b1',
    clientId: 'c1',
    channel: 'sim',
    waId: '972500000000',
    status: 'bot',
    lastMessageAt: 1000,
    lastInboundAt: 1000,
    unread: 2,
    windowExpiresAt: 99999,
    ...over
  }) as unknown as Conversation

const row = (id: string, over: Partial<Conversation> = {}): ConversationRow => ({
  ...conv(id, over),
  client: { _id: 'c1', name: 'דנה', phone: '050' },
  last: null
})

const msg = (id: string): Message =>
  ({ _id: id, conversationId: 'a', direction: 'out', author: 'member', kind: 'text', text: 'hi', at: 1 }) as Message

describe('ConversationDataService (plan 677)', () => {
  let service: ConversationDataService
  let http: HttpTestingController
  const logging = jasmine.createSpyObj<LoggingService>('LoggingService', ['warn', 'error'])

  beforeEach(() => {
    logging.warn.calls.reset()
    logging.error.calls.reset()
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LoggingService, useValue: logging }]
    })
    service = TestBed.inject(ConversationDataService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  async function loadList(rows: ConversationRow[] = [row('a'), row('b', { unread: 0 })]) {
    const p = service.list()
    http.expectOne((r) => r.url.endsWith('/api/v1/conversations')).flush({ conversations: rows, now: 5000 })
    await p
  }

  it('list() fills conversations_ and now_', async () => {
    await loadList()
    expect(service.conversations_().length).toBe(2)
    expect(service.now_()).toBe(5000)
    expect(service.listFailed_()).toBeFalse()
  })

  it('list({ test: true }) sends test=1', async () => {
    const p = service.list({ test: true })
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/conversations'))
    expect(req.request.params.get('test')).toBe('1')
    req.flush({ conversations: [], now: 1 })
    await p
  })

  it('open(id, { peek: true }) sends peek=1 and leaves the row unread', async () => {
    await loadList()
    const p = service.open('a', { peek: true })
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/conversations/a/messages'))
    expect(req.request.params.get('peek')).toBe('1')
    req.flush({ conversation: conv('a'), messages: [msg('m1')], now: 6000 })
    await p
    expect(service.conversations_().find((r) => r._id === 'a')?.unread).toBe(2)
    expect(service.thread_()?.messages.length).toBe(1)
  })

  it('a failed list() keeps the last list and sets listFailed_', async () => {
    await loadList()
    const p = service.list()
    http.expectOne((r) => r.url.endsWith('/api/v1/conversations')).flush({}, { status: 500, statusText: 'x' })
    await p
    expect(service.conversations_().length).toBe(2)
    expect(service.listFailed_()).toBeTrue()
    expect(logging.error).toHaveBeenCalled()
  })

  it('open(id) fills thread_ and zeroes that row unread', async () => {
    await loadList()
    const p = service.open('a')
    http
      .expectOne((r) => r.url.endsWith('/conversations/a/messages'))
      .flush({ conversation: conv('a'), messages: [msg('m1')], now: 6000 })
    await p
    expect(service.thread_()?.messages.length).toBe(1)
    expect(service.thread_()?.conversation._id).toBe('a')
    expect(service.conversations_().find((r) => r._id === 'a')?.unread).toBe(0)
  })

  it('open(id) of a missing conversation sets threadFailed_ to not_found', async () => {
    const p = service.open('zz')
    http.expectOne((r) => r.url.endsWith('/conversations/zz/messages')).flush({}, { status: 404, statusText: 'x' })
    await p
    expect(service.threadFailed_()).toBe('not_found')
    expect(service.thread_()).toBeNull()
  })

  async function openA() {
    await loadList()
    const p = service.open('a')
    http
      .expectOne((r) => r.url.endsWith('/conversations/a/messages'))
      .flush({ conversation: conv('a'), messages: [], now: 6000 })
    await p
  }

  it('reply() posts the text and appends the message', async () => {
    await openA()
    const p = service.reply('a', 'שלום')
    const req = http.expectOne((r) => r.url.endsWith('/conversations/a/messages'))
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ text: 'שלום' })
    req.flush({ message: msg('m2'), conversation: conv('a', { status: 'human' }) })
    expect(await p).toEqual({ ok: true })
    expect(service.thread_()?.messages.length).toBe(1)
    expect(service.thread_()?.conversation.status).toBe('human')
    expect(service.conversations_().find((r) => r._id === 'a')?.status).toBe('human')
  })

  it('sendTemplate() posts the template and its values', async () => {
    await openA()
    const p = service.sendTemplate('a', 'need_more_info', { text: 'מתי?' })
    const req = http.expectOne((r) => r.url.endsWith('/conversations/a/messages'))
    expect(req.request.body).toEqual({ template: { name: 'need_more_info', values: { text: 'מתי?' } } })
    req.flush({ message: msg('m3'), conversation: conv('a') })
    expect(await p).toEqual({ ok: true })
  })

  it('takeOver, handBack and close call their routes and update the signals', async () => {
    await openA()
    let p = service.takeOver('a')
    let req = http.expectOne((r) => r.url.endsWith('/conversations/a/takeover'))
    expect(req.request.method).toBe('PUT')
    req.flush(conv('a', { status: 'human' }))
    expect(await p).toEqual({ ok: true })
    expect(service.thread_()?.conversation.status).toBe('human')

    p = service.handBack('a')
    req = http.expectOne((r) => r.url.endsWith('/conversations/a/release'))
    req.flush(conv('a', { status: 'bot' }))
    expect(await p).toEqual({ ok: true })
    expect(service.conversations_().find((r) => r._id === 'a')?.status).toBe('bot')

    p = service.close('a')
    req = http.expectOne((r) => r.url.endsWith('/conversations/a/close'))
    req.flush(conv('a', { status: 'closed' }))
    expect(await p).toEqual({ ok: true })
    expect(service.conversations_().some((r) => r._id === 'a')).toBeFalse()
    expect(service.thread_()).toBeNull()
  })

  for (const code of ['WINDOW_CLOSED', 'DO_NOT_CONTACT', 'BAD_STATUS']) {
    it(`a 409 ${code} comes back as { ok: false, code }`, async () => {
      const p = service.reply('a', 'x')
      http
        .expectOne((r) => r.url.endsWith('/conversations/a/messages'))
        .flush({ error: code }, { status: 409, statusText: 'x' })
      expect(await p).toEqual({ ok: false, code })
      expect(logging.warn).toHaveBeenCalled()
    })
  }
})
