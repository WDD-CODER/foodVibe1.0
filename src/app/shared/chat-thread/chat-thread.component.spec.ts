import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, signal } from '@angular/core'
import { By } from '@angular/platform-browser'
import { LucideAngularModule, Check, CheckCheck, Clock, X } from 'lucide-angular'
import { TranslationService } from '@services/translation.service'
import { ChatThreadComponent } from './chat-thread.component'
import type { Message } from '@models/conversation.model'

const DICT: Record<string, string> = {
  chat_by_ai: 'העוזר',
  chat_by_member: 'צוות',
  chat_by_server: 'אוטומטי',
  chat_st_queued: 'בדרך',
  chat_st_sent: 'נשלחה',
  chat_st_delivered: 'הגיעה',
  chat_st_read: 'נקראה',
  chat_st_failed: 'נכשלה',
  tpl_booking_reminder: 'שלום {name}, מזכירים בשעה {time} ל-{partySize}',
  tpl_btn_confirm: 'מגיעים',
  tpl_btn_cancel: 'מבטלים'
}

const m = (id: string, over: Partial<Message> = {}): Message =>
  ({
    _id: id,
    businessId: 'b',
    conversationId: 'c',
    direction: 'out',
    author: 'member',
    kind: 'text',
    text: 'טקסט ' + id,
    at: Date.UTC(2026, 10, 20, 10, 0),
    providerMessageId: id,
    status: 'sent',
    ...over
  }) as Message

@Component({
  standalone: true,
  imports: [ChatThreadComponent],
  template: `<app-chat-thread
    [messages]="messages()"
    [now]="0"
    [perspective]="perspective()"
    [buttonsEnabled]="enabled()"
    (buttonTapped)="tapped.push($event)"
  />`
})
class HostComponent {
  messages = signal<Message[]>([])
  perspective = signal<'business' | 'guest'>('business')
  enabled = signal(false)
  tapped: string[] = []
}

describe('ChatThreadComponent (plan 677)', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick({ Check, CheckCheck, Clock, X })],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => DICT[k] ?? k } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
  })

  const el = () => fixture.nativeElement as HTMLElement
  const rows = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="chat-bubble"]'))

  it('puts inbound and outbound on opposite sides and swaps them for the guest perspective', () => {
    host.messages.set([m('1', { direction: 'in', author: 'guest' }), m('2')])
    fixture.detectChanges()
    expect(rows().map((r) => r.dataset['mine'])).toEqual(['false', 'true'])
    host.perspective.set('guest')
    fixture.detectChanges()
    expect(rows().map((r) => r.dataset['mine'])).toEqual(['true', 'false'])
  })

  it('shows a template message with its dictionary body and values, not the raw name', () => {
    host.messages.set([
      m('1', {
        kind: 'template',
        text: 'raw',
        template: { name: 'booking_reminder', params: ['דנה', '20:00', '4'] }
      })
    ])
    fixture.detectChanges()
    expect(rows()[0].textContent).toContain('שלום דנה, מזכירים בשעה 20:00 ל-4')
    expect(rows()[0].textContent).not.toContain('booking_reminder')
  })

  it('renders buttons only on the last outbound message and emits the id when enabled', () => {
    const buttons = [
      { id: 'CONFIRM:t', title: 'tpl_btn_confirm' },
      { id: 'CANCEL:t', title: 'tpl_btn_cancel' }
    ]
    host.messages.set([m('1', { buttons }), m('2', { buttons }), m('3', { direction: 'in', author: 'guest' })])
    fixture.detectChanges()
    const btns = () => fixture.debugElement.queryAll(By.css('[data-testid="chat-button"]'))
    expect(btns().length).toBe(2)
    expect(btns()[0].nativeElement.textContent.trim()).toBe('מגיעים')
    expect(btns()[0].nativeElement.disabled).toBeTrue()
    host.enabled.set(true)
    fixture.detectChanges()
    btns()[1].nativeElement.click()
    expect(host.tapped).toEqual(['CANCEL:t'])
  })

  it('shows each of the five statuses with its own icon and label', () => {
    const statuses = ['queued', 'sent', 'delivered', 'read', 'failed'] as const
    host.messages.set(statuses.map((s, i) => m(String(i), { status: s })))
    fixture.detectChanges()
    const marks = Array.from(el().querySelectorAll<HTMLElement>('[data-testid="chat-status"]'))
    expect(marks.map((x) => x.getAttribute('aria-label'))).toEqual(['בדרך', 'נשלחה', 'הגיעה', 'נקראה', 'נכשלה'])
    const icons = marks.map((x) => x.querySelector('svg')?.getAttribute('class') ?? '')
    const expected = ['clock', 'check', 'check-check', 'check-check', 'x']
    expected.forEach((name, i) => expect(icons[i]).withContext(name).toContain(`lucide-${name}`))
    expect(marks[3].classList).toContain('ct-status--read')
    expect(marks[4].classList).toContain('ct-status--failed')
  })

  it('draws a day line between messages of different Jerusalem dates', () => {
    const day = 24 * 60 * 60 * 1000
    host.messages.set([
      m('1'),
      m('2', { at: Date.UTC(2026, 10, 20, 11, 0) }),
      m('3', { at: Date.UTC(2026, 10, 20, 10, 0) + day })
    ])
    fixture.detectChanges()
    expect(el().querySelectorAll('[data-testid="chat-day"]').length).toBe(2)
  })

  it('tags the author of an outbound message', () => {
    host.messages.set([m('1', { author: 'ai' }), m('2', { author: 'member' }), m('3', { author: 'server' })])
    fixture.detectChanges()
    const tags = Array.from(el().querySelectorAll('[data-testid="chat-author"]')).map((x) => x.textContent?.trim())
    expect(tags).toEqual(['העוזר', 'צוות', 'אוטומטי'])
  })
})
