import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { todayIso } from 'src/app/core/utils/date-input.util'
import { TranslationService } from '@services/translation.service'
import { DepositPaidAnswer, DepositPaidDialogComponent } from './deposit-paid-dialog.component'

describe('DepositPaidDialogComponent', () => {
  let fixture: ComponentFixture<DepositPaidDialogComponent>
  let el: HTMLElement
  let answers: DepositPaidAnswer[]
  let cancels: number

  const dateInput = () => el.querySelector<HTMLInputElement>('#deposit-paid-date')!
  const amountInput = () => el.querySelector<HTMLInputElement>('#deposit-paid-amount')!
  const saveButton = () => el.querySelector<HTMLButtonElement>('.c-modal-actions .c-btn-primary')!

  function typeInto(input: HTMLInputElement, value: string): void {
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  async function create(deposit?: { amount?: number; date?: string }): Promise<void> {
    fixture = TestBed.createComponent(DepositPaidDialogComponent)
    fixture.componentRef.setInput('deposit', deposit)
    answers = []
    cancels = 0
    fixture.componentInstance.confirmed.subscribe((a) => answers.push(a))
    fixture.componentInstance.cancelled.subscribe(() => cancels++)
    el = fixture.nativeElement
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositPaidDialogComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (key: string) => `T:${key}` } }]
    }).compileComponents()
  })

  it('pre-fills today and keeps save disabled while the amount is empty', async () => {
    await create()
    const [d, m, y] = dateInput().value.split('/')
    expect(`${y}-${m}-${d}`).toBe(todayIso())
    expect(saveButton().disabled).toBeTrue()
  })

  it('says the amount is required once the field was touched and left empty', async () => {
    await create()
    typeInto(amountInput(), '5')
    typeInto(amountInput(), '')
    expect(el.querySelector('.c-field-error')?.textContent).toContain('T:deposit_amount_required')
    expect(saveButton().disabled).toBeTrue()
  })

  it('rejects an amount of 0', async () => {
    await create()
    typeInto(amountInput(), '0')
    expect(saveButton().disabled).toBeTrue()
  })

  it('emits the date and the amount on save', async () => {
    await create()
    typeInto(dateInput(), '05012027')
    typeInto(amountInput(), '500')
    expect(saveButton().disabled).toBeFalse()
    saveButton().click()
    expect(answers).toEqual([{ date: '2027-01-05', amount: 500 }])
  })

  it('blocks save for an impossible date', async () => {
    await create()
    typeInto(dateInput(), '31022026')
    typeInto(amountInput(), '500')
    expect(saveButton().disabled).toBeTrue()
  })

  it('pre-fills the values the event already has', async () => {
    await create({ amount: 250, date: '2026-11-03' })
    expect(dateInput().value).toBe('03/11/2026')
    expect(amountInput().value).toBe('250')
    expect(saveButton().disabled).toBeFalse()
  })

  it('cancels on Escape and on the cancel button', async () => {
    await create()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    el.querySelector<HTMLButtonElement>('.c-btn-ghost')!.click()
    expect(cancels).toBe(2)
    expect(answers).toEqual([])
  })
})
