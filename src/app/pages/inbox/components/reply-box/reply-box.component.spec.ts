import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, signal } from '@angular/core'
import { Hand, LucideAngularModule, Send } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ConversationDataService } from '@services/conversation-data.service'
import { TranslationService } from '@services/translation.service'
import type { Conversation } from '@models/conversation.model'
import { ReplyBoxComponent } from './reply-box.component'

const NOW = 1_000_000
const conv = (over: Partial<Conversation> = {}): Conversation =>
  ({ _id: 'c1', status: 'human', windowExpiresAt: NOW + 1000, ...over }) as unknown as Conversation

@Component({
  standalone: true,
  imports: [ReplyBoxComponent],
  template: `<app-reply-box
    [conversation]="conversation()"
    [now]="now"
    [draft]="draft()"
    (draftChange)="draft.set($event)"
    (closedMeanwhile)="closed = closed + 1"
  />`
})
class HostComponent {
  conversation = signal(conv())
  draft = signal('')
  now = NOW
  closed = 0
}

describe('ReplyBoxComponent (plan 677)', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent
  let data: { reply: jasmine.Spy; sendTemplate: jasmine.Spy; takeOver: jasmine.Spy }

  beforeEach(async () => {
    data = {
      reply: jasmine.createSpy('reply').and.resolveTo({ ok: true }),
      sendTemplate: jasmine.createSpy('sendTemplate').and.resolveTo({ ok: true }),
      takeOver: jasmine.createSpy('takeOver').and.resolveTo({ ok: true })
    }
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, Send, Hand })],
      providers: [
        { provide: ConversationDataService, useValue: data },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  const q = <T extends HTMLElement>(id: string) =>
    fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as T | null
  const key = (shiftKey: boolean) => {
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true })
    q('reply-text')!.dispatchEvent(e)
    return e
  }

  it('disables send for empty or spaces-only text', () => {
    expect(q<HTMLButtonElement>('reply-send')!.disabled).toBeTrue()
    host.draft.set('   ')
    fixture.detectChanges()
    expect(q<HTMLButtonElement>('reply-send')!.disabled).toBeTrue()
    host.draft.set('שלום')
    fixture.detectChanges()
    expect(q<HTMLButtonElement>('reply-send')!.disabled).toBeFalse()
  })

  it('sends on Enter and empties the box; Shift+Enter does not send', async () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList)
    host.draft.set('שלום דנה')
    fixture.detectChanges()
    key(true)
    expect(data.reply).not.toHaveBeenCalled()
    key(false)
    await fixture.whenStable()
    expect(data.reply).toHaveBeenCalledWith('c1', 'שלום דנה')
    expect(host.draft()).toBe('')
  })

  it('switches to the template choice on WINDOW_CLOSED and keeps the typed text there', async () => {
    data.reply.and.resolveTo({ ok: false, code: 'WINDOW_CLOSED' })
    host.draft.set('מתי תגיעו?')
    fixture.detectChanges()
    q<HTMLButtonElement>('reply-send')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
    await fixture.whenStable()
    expect(q('reply-text')).toBeNull()
    expect(q<HTMLInputElement>('template-text')!.value).toBe('מתי תגיעו?')
    expect(q('reply-error')?.textContent).toContain('ibx_window_closed_now')
  })

  it('sends the need_more_info template with its text', async () => {
    host.conversation.set(conv({ windowExpiresAt: NOW - 1 }))
    fixture.detectChanges()
    const input = q<HTMLInputElement>('template-text')!
    input.value = 'באיזו שעה?'
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
    q<HTMLButtonElement>('template-send')!.click()
    await fixture.whenStable()
    expect(data.sendTemplate).toHaveBeenCalledWith('c1', 'need_more_info', { text: 'באיזו שעה?' })
  })

  it('tells the page the conversation was closed meanwhile on BAD_STATUS', async () => {
    data.reply.and.resolveTo({ ok: false, code: 'BAD_STATUS' })
    host.draft.set('היי')
    fixture.detectChanges()
    q<HTMLButtonElement>('reply-send')!.click()
    await fixture.whenStable()
    expect(host.closed).toBe(1)
  })
})
