import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { ConversationDataService } from '@services/conversation-data.service'
import { TranslationService } from '@services/translation.service'
import { FixAnswerDialogComponent } from './fix-answer-dialog.component'

describe('FixAnswerDialogComponent (plan 682)', () => {
  let fixture: ComponentFixture<FixAnswerDialogComponent>
  let data: { fixAnswer: jasmine.Spy }
  const q = <T extends HTMLElement>(id: string) =>
    fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as T | null

  beforeEach(async () => {
    data = { fixAnswer: jasmine.createSpy('fixAnswer').and.resolveTo({ ok: true, drafted: true }) }
    await TestBed.configureTestingModule({
      imports: [FixAnswerDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: ConversationDataService, useValue: data },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    fixture = TestBed.createComponent(FixAnswerDialogComponent)
    fixture.componentRef.setInput('conversationId', 'c1')
    fixture.componentRef.setInput('messageId', 'm1')
    fixture.componentRef.setInput('quote', 'כן, יש חניה')
    fixture.detectChanges()
  })

  const type = (value: string) => {
    const el = q<HTMLTextAreaElement>('fix-answer')!
    el.value = value
    el.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const pick = (value: string) => {
    const dlg = fixture.componentInstance as unknown as { issue_: { set: (v: string) => void } }
    dlg.issue_.set(value)
    fixture.detectChanges()
  }

  it('quotes the wrong message and disables save until both fields are valid', () => {
    expect(q('fix-quote')?.textContent).toContain('כן, יש חניה')
    expect(q<HTMLButtonElement>('fix-save')!.disabled).toBeTrue()
    type('אין חניה')
    expect(q<HTMLButtonElement>('fix-save')!.disabled).toBeTrue()
    pick('wrong_info')
    expect(q<HTMLButtonElement>('fix-save')!.disabled).toBeFalse()
  })

  it('puts the explanation of the issue choice in a tooltip, not as text', () => {
    const wrap = fixture.nativeElement.querySelector('.fx-issue') as HTMLElement
    expect(wrap.getAttribute('title')).toBe('ibx_fix_issue_hint')
    expect(fixture.nativeElement.textContent).not.toContain('ibx_fix_issue_hint')
  })

  it('shows the counter only from 1000 characters', () => {
    type('א'.repeat(999))
    expect(q('fix-counter')).toBeNull()
    type('א'.repeat(1000))
    expect(q('fix-counter')?.textContent).toContain('1000/1200')
  })

  it('saves through the service and emits drafted', async () => {
    let saved: boolean | null = null
    fixture.componentInstance.saved.subscribe((d) => (saved = d))
    type('  אין חניה  ')
    pick('outdated')
    q<HTMLButtonElement>('fix-save')!.click()
    await fixture.whenStable()
    expect(data.fixAnswer).toHaveBeenCalledWith('c1', 'm1', 'אין חניה', 'outdated')
    expect(saved as boolean | null).toBeTrue()
  })

  it('on failure stays open, keeps the text and shows the error', async () => {
    data.fixAnswer.and.resolveTo({ ok: false })
    let saved = 0
    fixture.componentInstance.saved.subscribe(() => saved++)
    type('אין חניה')
    pick('other')
    q<HTMLButtonElement>('fix-save')!.click()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(saved).toBe(0)
    expect(q('fix-failed')).not.toBeNull()
    expect(q<HTMLTextAreaElement>('fix-answer')!.value).toBe('אין חניה')
  })

  it('cancel emits closed', () => {
    let closed = 0
    fixture.componentInstance.closed.subscribe(() => closed++)
    q<HTMLButtonElement>('fix-cancel')!.click()
    expect(closed).toBe(1)
  })
})
