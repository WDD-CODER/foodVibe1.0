import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { RequestKindCardComponent, emptyKindConfig, nextCustomKey } from './request-kind-card.component'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { TranslationService } from '@services/translation.service'
import type { RequestKindConfig } from '@models/front-desk-profile.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

const q = (key: string) => ({ key, label: key, type: 'text' as const, required: false })

describe('RequestKindCardComponent (plan 553)', () => {
  let fixture: ComponentFixture<RequestKindCardComponent>
  let confirmAnswer: boolean

  function setup(config: RequestKindConfig, disabled = false): void {
    confirmAnswer = true
    TestBed.configureTestingModule({
      imports: [RequestKindCardComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(confirmAnswer) } },
        {
          provide: TranslationService,
          useValue: { translate: (k: string | undefined) => k ?? '' }
        }
      ]
    })
    fixture = TestBed.createComponent(RequestKindCardComponent)
    fixture.componentRef.setInput('kind', 'event')
    fixture.componentRef.setInput('config', config)
    fixture.componentRef.setInput('disabled', disabled)
    fixture.detectChanges()
  }

  const el = (): HTMLElement => fixture.nativeElement
  const cfg = (): RequestKindConfig => fixture.componentInstance.config()
  const addBtn = (): HTMLButtonElement => el().querySelector('[data-testid="add-question"]') as HTMLButtonElement

  it('numbers a new question with the lowest free custom key', () => {
    expect(nextCustomKey([])).toBe('custom_1')
    expect(nextCustomKey([q('custom_1'), q('custom_3')])).toBe('custom_2')
  })

  it('adds a question and disables the add button at 12', () => {
    setup({ ...emptyKindConfig(), enabled: true, questions: Array.from({ length: 11 }, (_, i) => q('k' + i)) })
    expect(addBtn().disabled).toBeFalse()
    addBtn().click()
    fixture.detectChanges()
    expect(cfg().questions.length).toBe(12)
    expect(cfg().questions[11].key).toBe('custom_1')
    expect(addBtn().disabled).toBeTrue()
    addBtn().click()
    expect(cfg().questions.length).toBe(12)
  })

  it('removes a question only after the confirm says yes', async () => {
    setup({ ...emptyKindConfig(), enabled: true, questions: [q('a'), q('b')] })
    confirmAnswer = false
    ;(el().querySelector('[data-testid="remove-question"]') as HTMLButtonElement).click()
    await fixture.whenStable()
    expect(cfg().questions.length).toBe(2)
    confirmAnswer = true
    ;(el().querySelector('[data-testid="remove-question"]') as HTMLButtonElement).click()
    await fixture.whenStable()
    expect(cfg().questions.map((x) => x.key)).toEqual(['b'])
  })

  it('collapses when off and keeps the questions', () => {
    setup({ ...emptyKindConfig(), enabled: false, questions: [q('a')] })
    expect(el().querySelector('[data-testid="question-row"]')).toBeNull()
    expect(el().querySelector('[data-testid="kind-summary"]')).not.toBeNull()
    expect(cfg().questions.length).toBe(1)
  })

  it('locks every control for a disabled card', () => {
    setup({ ...emptyKindConfig(), enabled: true, questions: [q('a')] }, true)
    expect(el().querySelector('fieldset')?.disabled).toBeTrue()
    expect((el().querySelector('[data-testid="kind-enabled-event"]') as HTMLInputElement).disabled).toBeTrue()
  })
})
