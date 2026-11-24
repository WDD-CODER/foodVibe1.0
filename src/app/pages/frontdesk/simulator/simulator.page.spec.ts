import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, WritableSignal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { Bot, FastForward, LucideAngularModule, MessageCircle, Send, Smartphone } from 'lucide-angular'
import { FrontDeskProfileDataService } from '@services/front-desk-profile-data.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { ConversationDataService } from '@services/conversation-data.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'
import type { Conversation, ConversationRow, Message } from '@models/conversation.model'
import { SimulatorService } from './services/simulator.service'
import { SimulatorPage } from './simulator.page'

const DICT: Record<string, string> = {
  sim_title: 'סימולטור שיחות',
  sim_banner: 'מצב בדיקה — שום הודעה לא נשלחת החוצה',
  sim_owner_only: 'הסימולטור פתוח לבעל העסק בלבד',
  sim_no_guests: 'אין אורחי בדיקה',
  sim_real_client: 'המספר הזה שייך ללקוח אמיתי. בחרו מספר אחר',
  sim_send_failed: 'ההודעה לא נשלחה',
  sim_window_open: 'חלון 24 השעות פתוח עוד {time}',
  sim_window_closed: 'חלון 24 השעות נסגר',
  sim_job_nothing: 'אין מה להריץ עכשיו',
  sim_new_guest: 'אורח חדש',
  sim_start: 'התחלת שיחה',
  sim_send: 'שליחה',
  sim_clear: 'ניקוי נתוני בדיקה',
  sim_clear_confirm_text: 'כל נתוני הבדיקה יימחקו',
  sim_level_0: 'רמת טיוטות',
  sim_level_1: 'העוזר עונה לאורחים לבד',
  sim_held_by_staff: 'השיחה אצל הצוות',
  sim_draft_label: 'טיוטת העוזר לצוות',
  sim_hand_back_failed: 'לא הצלחנו להחזיר',
  ibx_hand_back: 'החזרה לעוזר'
}

const NOW = Date.UTC(2026, 10, 20, 12, 0)
const conv = (id: string, over: Partial<Conversation> = {}): Conversation =>
  ({
    _id: id,
    businessId: 'b',
    clientId: 'c' + id,
    channel: 'sim',
    waId: '972500000001',
    status: 'bot',
    lastMessageAt: NOW,
    lastInboundAt: NOW,
    unread: 0,
    windowExpiresAt: NOW + 3 * 3_600_000 + 5 * 60_000,
    test: true,
    ...over
  }) as unknown as Conversation

const row = (id: string, name: string, phone: string, over: Partial<Conversation> = {}): ConversationRow => ({
  ...conv(id, over),
  client: { _id: 'c' + id, name, phone, tags: ['test'] },
  last: null
})

const msg = (id: string, direction: 'in' | 'out', text: string, buttons?: { id: string; title: string }[]): Message =>
  ({
    _id: id,
    conversationId: 'a',
    direction,
    author: direction === 'in' ? 'guest' : 'ai',
    kind: 'text',
    text,
    status: 'sent',
    at: NOW,
    ...(buttons && { buttons })
  }) as unknown as Message

describe('SimulatorPage (plan 678)', () => {
  let fixture: ComponentFixture<SimulatorPage>
  let conversations: WritableSignal<ConversationRow[]>
  let thread: WritableSignal<{ conversation: Conversation; messages: Message[] } | null>
  let owner: WritableSignal<boolean>
  let data: Record<string, unknown>
  let sim: Record<string, jasmine.Spy>
  let confirm: jasmine.Spy
  let userMsg: jasmine.SpyObj<UserMsgService>
  let profile: WritableSignal<{ assistant: { level: number } } | null>

  async function create() {
    await TestBed.configureTestingModule({
      imports: [
        SimulatorPage,
        LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FastForward, MessageCircle, Send, Smartphone, Bot })
      ],
      providers: [
        provideRouter([]),
        {
          provide: FrontDeskProfileDataService,
          useValue: { profile_: profile, ensureLoaded: () => Promise.resolve() }
        },
        { provide: ConversationDataService, useValue: data },
        { provide: SimulatorService, useValue: sim },
        { provide: PermissionService, useValue: { isOwner_: owner } },
        { provide: UserService, useValue: { isPlatformAdmin_: signal(false) } },
        { provide: ConfirmModalService, useValue: { open: confirm } },
        { provide: TranslationService, useValue: { translate: (k: string) => DICT[k] ?? k } },
        { provide: UserMsgService, useValue: userMsg }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(SimulatorPage)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(() => {
    owner = signal(true)
    profile = signal(null)
    conversations = signal<ConversationRow[]>([])
    thread = signal(null)
    userMsg = jasmine.createSpyObj<UserMsgService>('UserMsgService', ['onSetErrorMsg', 'onSetSuccessMsg'])
    confirm = jasmine.createSpy('confirm').and.resolveTo(true)
    data = {
      conversations_: conversations,
      listLoaded_: signal(true),
      listFailed_: signal(false),
      thread_: thread,
      threadNow_: signal(NOW),
      threadFailed_: signal(null),
      list: jasmine.createSpy('list').and.resolveTo(),
      open: jasmine.createSpy('open').and.callFake(async (id: string) => {
        const r = conversations().find((c) => c._id === id)
        thread.set({ conversation: r ?? conv(id), messages: [msg('m1', 'in', 'שלום'), msg('m2', 'out', 'היי')] })
      }),
      closeThread: jasmine.createSpy('closeThread').and.callFake(() => thread.set(null)),
      handBack: jasmine.createSpy('handBack').and.resolveTo({ ok: true })
    }
    sim = {
      send: jasmine.createSpy('send').and.resolveTo({ ok: true, conversationId: 'a' }),
      tap: jasmine.createSpy('tap').and.resolveTo({ ok: true, conversationId: 'a' }),
      runJob: jasmine.createSpy('runJob').and.resolveTo({ ok: true, job: 'reminder', done: true }),
      clearTestData: jasmine.createSpy('clearTestData').and.resolveTo({ ok: true })
    }
  })

  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const text = (e: Element | null) => e?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const type = async (id: string, value: string) => {
    const input = byId<HTMLInputElement | HTMLTextAreaElement>(id)!
    input.value = value
    input.dispatchEvent(new Event('input'))
    await settle()
  }
  const pickGuest = async () => {
    byId('sim-guest')!.click()
    await settle()
  }

  it('always shows the banner, and the empty guest list message', async () => {
    await create()
    expect(text(byId('sim-banner'))).toContain('מצב בדיקה — שום הודעה לא נשלחת החוצה')
    expect(el().textContent).toContain('אין אורחי בדיקה')
    expect(data['list']).toHaveBeenCalledWith({ test: true })
  })

  it('shows staff only the owner-only message, no chat and no call', async () => {
    owner.set(false)
    await create()
    expect(el().textContent).toContain('הסימולטור פתוח לבעל העסק בלבד')
    expect(byId('sim-phone-frame')).toBeNull()
    expect(byId('sim-banner')).toBeNull()
    expect(data['list']).not.toHaveBeenCalled()
  })

  it('lists the test conversations by name and phone', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001'), row('b', 'דנה', '0500000002')])
    await create()
    const rows = Array.from(el().querySelectorAll('[data-testid="sim-guest"]')).map((r) => text(r))
    expect(rows).toEqual(['אורח בדיקה0500000001', 'דנה0500000002'])
  })

  it('"אורח חדש" needs a name and a phone of 9-15 digits before the start button is enabled', async () => {
    await create()
    byId('sim-new')!.click()
    await settle()
    const start = byId<HTMLButtonElement>('sim-start')!
    expect(start.disabled).toBeTrue()
    await type('sim-name', 'אורח')
    expect(start.disabled).toBeTrue()
    await type('sim-phone', '050-123')
    expect(start.disabled).toBeTrue()
    await type('sim-phone', '050-1234567')
    expect(start.disabled).toBeFalse()
    await type('sim-phone', 'abcdefghijk')
    expect(start.disabled).toBeTrue()
  })

  it('sending "שלום" calls send once, empties the box and shows the guest bubble at the guest side', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001')])
    await create()
    await pickGuest()
    await type('sim-text', 'שלום')
    byId('sim-send')!.click()
    await settle()
    expect(sim['send']).toHaveBeenCalledOnceWith('0500000001', 'אורח בדיקה', 'שלום')
    expect(byId<HTMLTextAreaElement>('sim-text')!.value).toBe('')
    const thr = el().querySelector('app-chat-thread')
    expect(thr).not.toBeNull()
    expect(text(thr)).toContain('שלום')
    expect(data['open']).toHaveBeenCalledWith('a', { peek: true })
  })

  it('a new guest sends nothing until the first message, then the list is read again', async () => {
    await create()
    byId('sim-new')!.click()
    await settle()
    await type('sim-name', 'אורח')
    await type('sim-phone', '0501234567')
    byId('sim-start')!.click()
    await settle()
    expect(sim['send']).not.toHaveBeenCalled()
    await type('sim-text', 'היי')
    byId('sim-send')!.click()
    await settle()
    expect(sim['send']).toHaveBeenCalledOnceWith('0501234567', 'אורח', 'היי')
    expect((data['list'] as jasmine.Spy).calls.count()).toBe(2)
  })

  it('a 409 REAL_CLIENT shows its message and keeps the text; another failure keeps the text too', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001')])
    await create()
    await pickGuest()
    await type('sim-text', 'שלום')
    sim['send'].and.resolveTo({ ok: false, code: 'REAL_CLIENT' })
    byId('sim-send')!.click()
    await settle()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('המספר הזה שייך ללקוח אמיתי. בחרו מספר אחר')
    expect(byId<HTMLTextAreaElement>('sim-text')!.value).toBe('שלום')
    sim['send'].and.resolveTo({ ok: false, code: null })
    byId('sim-send')!.click()
    await settle()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('ההודעה לא נשלחה')
    expect(byId<HTMLTextAreaElement>('sim-text')!.value).toBe('שלום')
  })

  it('the thread is read from the guest side with buttons on, and a tap calls tap with its id', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001', { bookingId: 'bk' })])
    ;(data['open'] as jasmine.Spy).and.callFake(async (id: string) =>
      thread.set({
        conversation: conversations().find((c) => c._id === id)!,
        messages: [msg('m2', 'out', 'תזכורת', [{ id: 'CANCEL:bk', title: 'מבטלים' }])]
      })
    )
    await create()
    await pickGuest()
    const chat = fixture.debugElement.query((d) => d.name === 'app-chat-thread')
    expect(chat.componentInstance.perspective()).toBe('guest')
    expect(chat.componentInstance.buttonsEnabled()).toBeTrue()
    const button = Array.from(el().querySelectorAll('app-chat-thread button')).find((b) => text(b).includes('מבטלים'))
    expect(button).toBeDefined()
    ;(button as HTMLButtonElement).click()
    await settle()
    expect(sim['tap']).toHaveBeenCalledOnceWith('0500000001', 'CANCEL:bk')
  })

  it('shows the assistant-failed note under the chat while at >= lastMessageAt, and not after', async () => {
    conversations.set([
      row('a', 'אורח בדיקה', '0500000001', { lastMessageAt: NOW, assistantFailed: { at: NOW, reason: 'busy' } })
    ])
    await create()
    await pickGuest()
    expect(byId('ai-failed-note')).not.toBeNull()
    conversations.set([
      row('a', 'אורח בדיקה', '0500000001', { lastMessageAt: NOW + 1, assistantFailed: { at: NOW, reason: 'busy' } })
    ])
    thread.set({ conversation: conversations()[0], messages: [] })
    fixture.detectChanges()
    expect(byId('ai-failed-note')).toBeNull()
  })

  it('says who answers: level 0, level 1 or 2, and nothing while no profile is loaded (plan 719)', async () => {
    await create()
    expect(byId('sim-level')).toBeNull()
    profile.set({ assistant: { level: 0 } })
    await settle()
    expect(text(byId('sim-level'))).toContain('רמת טיוטות')
    profile.set({ assistant: { level: 1 } })
    await settle()
    expect(text(byId('sim-level'))).toContain('העוזר עונה לאורחים לבד')
    profile.set({ assistant: { level: 2 } })
    await settle()
    expect(text(byId('sim-level'))).toContain('העוזר עונה לאורחים לבד')
  })

  it('a human conversation shows who holds it and hand back calls handBack once, then reads the thread (plan 719)', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001', { status: 'human' })])
    await create()
    await pickGuest()
    expect(text(byId('sim-held'))).toContain('השיחה אצל הצוות')
    const openCalls = (data['open'] as jasmine.Spy).calls.count()
    byId<HTMLButtonElement>('sim-hand-back')!.click()
    await settle()
    expect(data['handBack']).toHaveBeenCalledOnceWith('a')
    expect((data['open'] as jasmine.Spy).calls.count()).toBeGreaterThan(openCalls)
  })

  it('shows the level-0 draft under the chat, and no draft at level 1 (plan 719)', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001', { suggestion: 'לאיזה תאריך?' })])
    profile.set({ assistant: { level: 0 } })
    await create()
    await pickGuest()
    expect(text(byId('sim-draft'))).toContain('לאיזה תאריך?')
    expect(byId('sim-held')).toBeNull()
    profile.set({ assistant: { level: 1 } })
    await settle()
    expect(byId('sim-draft')).toBeNull()
  })

  it('shows the time left of the window from the server clock', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001')])
    await create()
    await pickGuest()
    expect(text(byId('sim-window'))).toContain('חלון 24 השעות פתוח עוד 03:05')
  })

  it('the clock buttons are disabled until the conversation has a booking; a run that did nothing says so', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001')])
    await create()
    await pickGuest()
    expect(byId<HTMLButtonElement>('sim-job-reminder')!.disabled).toBeTrue()
    expect(byId<HTMLButtonElement>('sim-job-late')!.disabled).toBeTrue()
    expect(byId('sim-clock-hint')).not.toBeNull()
    conversations.set([row('a', 'אורח בדיקה', '0500000001', { bookingId: 'bk' })])
    await pickGuest()
    expect(byId<HTMLButtonElement>('sim-job-reminder')!.disabled).toBeFalse()
    sim['runJob'].and.resolveTo({ ok: true, job: 'reminder', done: false, reason: 'ALREADY' })
    byId('sim-job-reminder')!.click()
    await settle()
    expect(sim['runJob']).toHaveBeenCalledOnceWith('a', 'reminder')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('אין מה להריץ עכשיו')
  })

  it('"ניקוי נתוני בדיקה" clears only on confirm, then the guest list is empty', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001')])
    await create()
    await pickGuest()
    confirm.and.resolveTo(false)
    byId('sim-clear')!.click()
    await settle()
    expect(sim['clearTestData']).not.toHaveBeenCalled()
    confirm.and.resolveTo(true)
    ;(data['list'] as jasmine.Spy).and.callFake(async () => conversations.set([]))
    byId('sim-clear')!.click()
    await settle()
    expect(sim['clearTestData']).toHaveBeenCalledTimes(1)
    expect(el().textContent).toContain('אין אורחי בדיקה')
    expect(byId('sim-guest')).toBeNull()
  })

  it('a failed clear keeps the screen as it is', async () => {
    conversations.set([row('a', 'אורח בדיקה', '0500000001')])
    await create()
    sim['clearTestData'].and.resolveTo({ ok: false, code: null })
    byId('sim-clear')!.click()
    await settle()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalled()
    expect(byId('sim-guest')).not.toBeNull()
  })
})
