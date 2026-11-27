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
  Flag,
  Hand,
  LucideAngularModule,
  MessageCircle,
  Send,
  Smartphone,
  X
} from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ConversationDataService } from '@services/conversation-data.service'
import { InboxBadgeService } from '@services/inbox-badge.service'
import { RequestDataService } from '@services/request-data.service'
import { TranslationService } from '@services/translation.service'
import { PermissionService } from '@services/permission.service'
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
  let owner: WritableSignal<boolean>
  let admin: WritableSignal<boolean>
  let userMsg: { onSetErrorMsg: jasmine.Spy; onSetSuccessMsg: jasmine.Spy }

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
          Flag,
          Hand,
          MessageCircle,
          Send,
          Smartphone,
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
        { provide: UserService, useValue: { user_: signal({ _id: 'me' }), isPlatformAdmin_: admin } },
        { provide: PermissionService, useValue: { isOwner_: owner } },
        { provide: UserMsgService, useValue: userMsg }
      ]
    }).compileComponents()
    http = TestBed.inject(HttpTestingController)
    fixture = TestBed.createComponent(InboxPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(() => {
    owner = signal(false)
    admin = signal(false)
    userMsg = { onSetErrorMsg: jasmine.createSpy('err'), onSetSuccessMsg: jasmine.createSpy('ok') }
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
      suggest: jasmine.createSpy('suggest').and.resolveTo({ ok: true, suggestion: 'נשמח לראותכם' }),
      fixAnswer: jasmine.createSpy('fixAnswer').and.resolveTo({ ok: true, drafted: true }),
      sendTemplate: jasmine.createSpy('sendTemplate').and.resolveTo({ ok: true })
    }
  })

  const el = () => fixture.nativeElement as HTMLElement
  const rowEls = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="inbox-row"]'))
  const text = (e: Element | null) => e?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

  it('shows the simulator link to an owner and hides it from staff', async () => {
    await create()
    expect(el().querySelector('[data-testid="sim-link"]')).toBeNull()
    expect(el().querySelector('[data-testid="asr-link"]')).toBeNull()
    owner.set(true)
    fixture.detectChanges()
    const link = el().querySelector('[data-testid="sim-link"]')
    expect(link?.getAttribute('href')).toBe('/frontdesk/simulator')
    expect(text(link)).toBe('sim_link')
    const runs = el().querySelector('[data-testid="asr-link"]')
    expect(runs?.getAttribute('href')).toBe('/frontdesk/assistant')
    expect(text(runs)).toBe('asr_link')
  })

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

  it('draws the conversations as shared rows, marks the open one and links to /inbox/:id (plan 706)', async () => {
    conversations.set([row('1', 'א'), row('2', 'ב'), row('3', 'ג')])
    await create('2')
    const rows = Array.from(el().querySelectorAll<HTMLElement>('.c-list-row'))
    expect(rows.length).toBe(3)
    const selected = rows.filter((r) => r.classList.contains('is-selected'))
    expect(selected.length).toBe(1)
    expect(text(selected[0].querySelector('.ibx-name'))).toBe('ב')
    const hrefs = rows.map((r) => r.querySelector('a.c-row-link')?.getAttribute('href'))
    expect(hrefs.sort()).toEqual(['/inbox/1', '/inbox/2', '/inbox/3'])
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

  describe('suggestion bar and fix (plan 682)', () => {
    const bar = () => el().querySelector('[data-testid="suggestion-bar"]')
    const click = (id: string) => {
      ;(el().querySelector(`[data-testid="${id}"]`) as HTMLElement).click()
      fixture.detectChanges()
    }
    const humanWith = (over: Partial<Conversation> = {}) =>
      conversations.set([row('1', 'דנה', { status: 'human', assignedTo: 'me', ...over })])

    it('is not rendered for a bot conversation or a closed window', async () => {
      conversations.set([row('1', 'דנה', { suggestion: 'x' })])
      await create('1')
      expect(bar()).toBeNull()
      fixture.destroy()
      TestBed.resetTestingModule()
      humanWith({ windowExpiresAt: NOW - 1 })
      await create('1')
      expect(bar()).toBeNull()
    })

    it('shows the stored suggestion and sends it as it is, then hides the bar', async () => {
      humanWith({ suggestion: 'שלום, אנחנו פתוחים' })
      await create('1')
      expect(text(el().querySelector('[data-testid="suggestion-text"]'))).toBe('שלום, אנחנו פתוחים')
      click('suggestion-send')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(data['reply']).toHaveBeenCalledWith('1', 'שלום, אנחנו פתוחים')
      expect(el().querySelector('[data-testid="suggestion-text"]')).toBeNull()
    })

    it('edit puts the text in the reply box and appends after a line break to typed text', async () => {
      humanWith({ suggestion: 'הצעה' })
      await create('1')
      click('suggestion-edit')
      const box = () => el().querySelector('[data-testid="reply-text"]') as HTMLTextAreaElement
      await fixture.whenStable()
      fixture.detectChanges()
      expect(box().value).toBe('הצעה')
      box().value = 'א'
      box().dispatchEvent(new Event('input'))
      fixture.detectChanges()
      click('suggestion-edit')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(box().value).toBe('א\nהצעה')
    })

    it('dismiss hides the bar text and offers the ask button', async () => {
      humanWith({ suggestion: 'הצעה' })
      await create('1')
      click('suggestion-dismiss')
      expect(el().querySelector('[data-testid="suggestion-text"]')).toBeNull()
      expect(el().querySelector('[data-testid="suggestion-ask"]')).not.toBeNull()
    })

    it('a refused send keeps the bar and shows the refusal', async () => {
      humanWith({ suggestion: 'הצעה' })
      ;(data['reply'] as jasmine.Spy).and.resolveTo({ ok: false, code: 'DO_NOT_CONTACT' })
      await create('1')
      click('suggestion-send')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(el().querySelector('[data-testid="suggestion-text"]')).not.toBeNull()
      expect(text(el().querySelector('[data-testid="suggestion-error"]'))).toBe('הלקוח ביקש שלא נפנה אליו')
    })

    it('ask calls suggest; a failure shows the failure line with retry', async () => {
      humanWith()
      ;(data['suggest'] as jasmine.Spy).and.resolveTo({ ok: false })
      await create('1')
      click('suggestion-ask')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(data['suggest']).toHaveBeenCalledWith('1')
      expect(el().querySelector('[data-testid="suggestion-failed"]')).not.toBeNull()
    })

    it('a failed suggest shows the line of its reason', async () => {
      for (const reason of ['busy', 'timeout', 'quota', 'other']) {
        humanWith()
        ;(data['suggest'] as jasmine.Spy).and.resolveTo({ ok: false, reason })
        await create('1')
        click('suggestion-ask')
        await fixture.whenStable()
        fixture.detectChanges()
        const key = reason === 'other' ? 'ibx_sg_failed' : 'ibx_sg_failed_' + reason
        expect(text(el().querySelector('[data-testid="suggestion-failed"]'))).toBe(key)
        fixture.destroy()
        TestBed.resetTestingModule()
      }
    })

    it('shows the handed-over note while assistantFailed.at >= lastMessageAt, and hides it after', async () => {
      humanWith({ lastMessageAt: NOW - 1000, assistantFailed: { at: NOW - 1000, reason: 'busy' } })
      await create('1')
      expect(text(el().querySelector('[data-testid="ai-failed-note"]'))).toBe('ibx_ai_failed_busy')
      fixture.destroy()
      TestBed.resetTestingModule()
      humanWith({ lastMessageAt: NOW - 500, assistantFailed: { at: NOW - 1000, reason: 'busy' } })
      await create('1')
      expect(el().querySelector('[data-testid="ai-failed-note"]')).toBeNull()
    })

    it('fix opens the dialog under an assistant message, saves and shows the saved message', async () => {
      humanWith()
      await create('1')
      thread.set({
        conversation: conversations()[0],
        messages: [
          {
            _id: 'a1',
            conversationId: '1',
            direction: 'out',
            author: 'ai',
            kind: 'text',
            text: 'יש חניה',
            at: NOW - 5000,
            status: 'sent'
          } as unknown as Message
        ]
      })
      fixture.detectChanges()
      click('chat-fix')
      expect(el().querySelector('[data-testid="fix-dialog"]')).not.toBeNull()
      const dlg = fixture.debugElement.query((d) => d.name === 'app-fix-answer-dialog').componentInstance as {
        answer_: { set: (v: string) => void }
        issue_: { set: (v: string) => void }
      }
      dlg.answer_.set('אין חניה')
      dlg.issue_.set('wrong_info')
      fixture.detectChanges()
      click('fix-save')
      await fixture.whenStable()
      fixture.detectChanges()
      expect(data['fixAnswer']).toHaveBeenCalledWith('1', 'a1', 'אין חניה', 'wrong_info')
      expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('ibx_fix_saved')
      expect(el().querySelector('[data-testid="fix-dialog"]')).toBeNull()
    })
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
