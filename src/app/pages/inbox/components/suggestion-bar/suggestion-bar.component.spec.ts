import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { TranslationService } from '@services/translation.service'
import { SuggestionBarComponent, type SuggestionState } from './suggestion-bar.component'

@Component({
  standalone: true,
  imports: [SuggestionBarComponent],
  template: `<app-suggestion-bar
    [suggestion]="text()"
    [state]="state()"
    [errorKey]="error()"
    [failKey]="failKey()"
    (send)="sent = sent + 1"
    (edit)="edited = edited + 1"
    (dismiss)="dismissed = dismissed + 1"
    (ask)="asked = asked + 1"
  />`
})
class HostComponent {
  text = signal('שלום')
  state = signal<SuggestionState>('idle')
  error = signal<string | null>(null)
  failKey = signal('ibx_sg_failed')
  sent = 0
  edited = 0
  dismissed = 0
  asked = 0
}

describe('SuggestionBarComponent (plan 682)', () => {
  let fixture: ComponentFixture<HostComponent>
  let host: HostComponent
  const q = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`)

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k } }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    host = fixture.componentInstance
    fixture.detectChanges()
  })

  it('shows the text with send, edit and dismiss, each emitting once', () => {
    expect(q('suggestion-text')?.textContent).toContain('שלום')
    q('suggestion-send')?.click()
    q('suggestion-edit')?.click()
    q('suggestion-dismiss')?.click()
    expect([host.sent, host.edited, host.dismissed]).toEqual([1, 1, 1])
  })

  it('without a text shows the ask button', () => {
    host.text.set('')
    fixture.detectChanges()
    expect(q('suggestion-text')).toBeNull()
    q('suggestion-ask')?.click()
    expect(host.asked).toBe(1)
  })

  it('while loading the ask button is disabled', () => {
    host.text.set('')
    host.state.set('loading')
    fixture.detectChanges()
    expect((q('suggestion-ask') as HTMLButtonElement).disabled).toBeTrue()
  })

  it('on failure shows the message and a retry that asks again', () => {
    host.text.set('')
    host.state.set('failed')
    fixture.detectChanges()
    expect(q('suggestion-failed')?.textContent).toContain('ibx_sg_failed')
    q('suggestion-ask')?.click()
    expect(host.asked).toBe(1)
  })

  it('shows the line of the failKey it is given', () => {
    host.text.set('')
    host.state.set('failed')
    for (const key of ['ibx_sg_failed_busy', 'ibx_sg_failed_timeout', 'ibx_sg_failed_quota']) {
      host.failKey.set(key)
      fixture.detectChanges()
      expect(q('suggestion-failed')?.textContent).toContain(key)
    }
  })

  it('shows a refusal key under the bar', () => {
    host.error.set('ibx_do_not_contact')
    fixture.detectChanges()
    expect(q('suggestion-error')?.textContent).toContain('ibx_do_not_contact')
  })
})
