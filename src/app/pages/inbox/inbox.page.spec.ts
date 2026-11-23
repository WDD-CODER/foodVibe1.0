import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import {
  ArrowRight,
  Bot,
  Check,
  CheckCheck,
  Clock,
  Hand,
  LucideAngularModule,
  MessageCircle,
  Send,
  X
} from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ConversationDataService } from '@services/conversation-data.service'
import { InboxBadgeService } from '@services/inbox-badge.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import type { Conversation, ConversationRow, Message } from '@models/conversation.model'
import { InboxPage } from './inbox.page'

const DICT: Record<string, string> = {
  ibx_filter_all: 'הכול',
  ibx_filter_mine: 'אצלי',
  ibx_filter_bot: 'אצל העוזר',
  ibx_filter_test: 'בדיקה',
  rq_test_tag: 'בדיקה',
  ibx_holder_bot: 'העוזר',
  ibx_holder_me: 'אני',
  ibx_holder_team: 'צוות',
  ibx_bot_answers: 'העוזר עונה בשיחה הזאת',
  ibx_take_over: 'אני עונה',
  ibx_hand_back: 'החזרה לעוזר',
  ibx_do_not_contact: 'הלקוח ביקש שלא נפנה אליו',
  ibx_empty: 'עדיין אין שיחות',
  ibx_load_failed: 'לא הצלחנו לטעון את השיחות',
  ibx_open: 'פתיחה',
  ibx_linked_booking: 'הזמנה',
  retry: 'נסה שוב',
  tpl_need_more_info: '{text}'
}

const NOW = Date.UTC(2026, 10, 20, 12, 0)
const conv = (id: string, over: Partial<Conversation> = {}): Conversation =>
  ({
    _id: id,
    businessId: 'b',
    clientId: 'c',
    channel: 'sim',
    waId: '972500000000',
    status: 'bot',
    lastMessageAt: NOW - 1000,
    lastInboundAt: NOW - 1000,
    unread: 0,
    windowExpiresAt: NOW + 3_600_000,
    ...over
  }) as unknown as Conversation

const row = (id: string, name: string, over: Partial<Conversation> = {}): ConversationRow => ({
  ...conv(id, over),
  client: { _id: 'c' + id, name, phone: '050' },
  last: { text: 'שלום', direction: 'in', kind: 'text', at: NOW - 1000 }
})

describe('InboxPage (plan 677)', () => {
  let fixture: ComponentFixture<InboxPage>
  let conversations: WritableSignal<ConversationRow[]>
  let thread: WritableSignal<{ conversation: Conversation; messages: Message[] } | null>
  let listFailed: WritableSignal<boolean>
  let listLoaded: WritableSignal<boolean>
  let params: BehaviorSubject<ParamMap>
  let data: Record<string, unknown>
  let http: HttpTestingController

  async function create(id: string | null = null) {
    params = new BehaviorSubject(convertToParamMap(id ? { id } : {}))
    await TestBed.configureTestingModule({
      imports: [
        InboxPage,
        LucideAngularModule.pick({
          ...TEST_LUCIDE_ICONS,
          ArrowRight,
          Bot,
          Check,
          CheckCheck,
          Clock,
          Hand,
          MessageCircle,
          Send,
          X
        })
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { paramMap: params.value } } },
        { provide: ConversationDataService, useValue: data },
        { provide: InboxBadgeService, useValue: { refresh: jasmine.createSpy('refresh').and.resolveTo() } },
        { provide: RequestDataService, useValue: { all_: signal([]), ensureLoaded: () => Promise.resolve() } },
        { provide: TranslationService, useValue: { translate: (k: string) => DICT[k] ?? k } },
        { provide: UserService, useValue: { user_: signal({ _id: 'me' }) } },
        { provide: UserMsgService, useValue: { onSetErrorMsg: jasmine.createSpy('err') } }
      ]
    }).compileComponents()
    http = TestBed.inject(HttpTestingController)
    fixture = TestBed.createComponent(InboxPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(() => {
    conversations = signal<ConversationRow[]>([])
    thread = signal(null)
    listFailed = signal(false)
    listLoaded = signal(true)
    data = {
      conversations_: conversations,
      now_: signal(NOW),
      listFailed_: listFailed,
      listLoaded_: listLoaded,
      thread_: thread,
      threadNow_: signal(NOW),
      threadFailed_: signal(null),
      list: jasmine.createSpy('list').and.resolveTo(),
      open: jasmine.createSpy('open').and.callFake(async (id: string) => {
        const r = conversations().find((c) => c._id === id)
        if (r) thread.set({ conversation: r, messages: [] })
      }),
      closeThread: jasmine.createSpy('closeThread'),
      takeOver: jasmine.createSpy('takeOver').and.resolveTo({ ok: true }),
      handBack: jasmine.createSpy('handBack').and.resolveTo({ ok: true }),
      close: jasmine.createSpy('close').and.resolveTo({ ok: true }),
      reply: jasmine.createSpy('reply').and.resolveTo({ ok: true }),
      sendTemplate: jasmine.createSpy('sendTemplate').and.resolveTo({ ok: true })
    }
  })

  const el = () => fixture.nativeElement as HTMLElement
  const rowEls = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="inbox-row"]'))
  const text = (e: Element | null) => e?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

  it('orders rows unread first, then newest first, with the holder tag of each', async () => {
    conversations.set([
      row('1', 'ישן', { lastMessageAt: NOW - 5000, status: 'human', assignedTo: 'other' }),
      row('2', 'חדש', { lastMessageAt: NOW - 100, status: 'human', assignedTo: 'me' }),
      row('3', 'דנה', { lastMessageAt: NOW - 9000, unread: 2 })
    ])
    await create()
    expect(rowEls().map((r) => text(r.querySelector('.ibx-name')))).toEqual(['דנה', 'חדש', 'ישן'])
    expect(rowEls().map((r) => text(r.querySelector('[data-testid="holder-tag"]')))).toEqual(['העוזר', 'אני', 'צוות'])
    expect(text(rowEls()[0].querySelector('[data-testid="unread-count"]'))).toBe('2')
  })

  it('narrows the list by the filter chips and reads the test conversations for "בדיקה"', async () => {
    conversations.set([
      row('1', 'בוט'),
      row('2', 'אני', { status: 'human', assignedTo: 'me' }),
      row('3', 'צוות', { status: 'human', assignedTo: 'other' })
    ])
    await create()
    const click = (f: string) => {
      ;(el().querySelector(`[data-testid="filter-${f}"]`) as HTMLInputElement).click()
      fixture.detectChanges()
    }
    click('mine')
    expect(rowEls().map((r) => text(r.querySelector('.ibx-name')))).toEqual(['אני'])
    click('bot')
    expect(rowEls().map((r) => text(r.querySelector('.ibx-name')))).toEqual(['בוט'])
    conversations.set([row('9', 'מדומה', { test: true })])
    click('test')
    expect(data['list']).toHaveBeenCalledWith({ test: true })
    expect(rowEls().length).toBe(1)
    expect(text(rowEls()[0].querySelector('[data-testid="test-tag"]'))).toBe('בדיקה')
  })

  it('shows the assistant line and "אני עונה" for a bot conversation', async () => {
    conversations.set([row('1', 'דנה')])
    await create('1')
    expect(text(el().querySelector('[data-testid="bot-line"]'))).toBe('העוזר עונה בשיחה הזאת')
    expect(text(el().querySelector('[data-testid="take-over"]'))).toBe('אני עונה')
    ;(el().querySelector('[data-testid="take-over"]') as HTMLElement).click()
    expect(data['takeOver']).toHaveBeenCalledWith('1')
  })

  it('shows "החזרה לעוזר" for a human conversation and hands it back', async () => {
    conversations.set([row('1', 'דנה', { status: 'human', assignedTo: 'me' })])
    await create('1')
    expect(el().querySelector('[data-testid="bot-line"]')).toBeNull()
    const btn = el().querySelector('[data-testid="hand-back"]') as HTMLElement
    expect(text(btn)).toBe('החזרה לעוזר')
    btn.click()
    expect(data['handBack']).toHaveBeenCalledWith('1')
  })

  it('shows the do-not-contact line when the reply is refused', async () => {
    conversations.set([row('1', 'דנה', { status: 'human', assignedTo: 'me' })])
    ;(data['reply'] as jasmine.Spy).and.resolveTo({ ok: false, code: 'DO_NOT_CONTACT' })
    await create('1')
    const box = el().querySelector('[data-testid="reply-text"]') as HTMLTextAreaElement
    box.value = 'היי'
    box.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    ;(el().querySelector('[data-testid="reply-send"]') as HTMLElement).click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(text(el().querySelector('[data-testid="reply-error"]'))).toBe('הלקוח ביקש שלא נפנה אליו')
  })

  it('replaces the text box with the template choice once the window has closed', async () => {
    conversations.set([row('1', 'דנה', { status: 'human', windowExpiresAt: NOW - 1 })])
    await create('1')
    expect(el().querySelector('[data-testid="reply-text"]')).toBeNull()
    expect(el().querySelector('[data-testid="template-choice"] app-custom-select')).not.toBeNull()
  })

  it('shows the linked booking with its date, time, party and the link "פתיחה"', async () => {
    conversations.set([row('1', 'דנה', { bookingId: 'bk1' })])
    await create('1')
    http
      .expectOne((r) => r.url.endsWith('/data/bookings/bk1'))
      .flush({ _id: 'bk1', date: '2026-11-21', time: '20:00', partySize: 4, status: 'confirmed' })
    await fixture.whenStable()
    fixture.detectChanges()
    const card = el().querySelector('[data-testid="linked-card"]')
    expect(text(card?.querySelector('[data-testid="card-date"]') ?? null)).toBe('2026-11-21')
    expect(text(card?.querySelector('[data-testid="card-time"]') ?? null)).toBe('20:00')
    expect(text(card?.querySelector('[data-testid="card-party"]') ?? null)).toBe('4')
    expect(text(card?.querySelector('[data-testid="card-open"]') ?? null)).toBe('פתיחה')
  })

  it('shows the empty message for an empty list', async () => {
    await create()
    expect(text(el().querySelector('.c-empty-state__msg'))).toBe('עדיין אין שיחות')
  })

  it('shows the error with "נסה שוב" when the first read failed', async () => {
    listFailed.set(true)
    await create()
    expect(text(el().querySelector('.c-empty-state__msg'))).toBe('לא הצלחנו לטעון את השיחות')
    const retry = el().querySelector('.c-empty-state button') as HTMLElement
    expect(text(retry)).toBe('נסה שוב')
    retry.click()
    expect(data['list']).toHaveBeenCalled()
  })
})
