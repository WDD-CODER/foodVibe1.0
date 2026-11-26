import { ComponentFixture, TestBed } from '@angular/core/testing'
import { defaultLabour, type LabourGroup } from '@schemas/month/month-rules'
import { TranslationService } from '@services/translation.service'
import { LabourCardComponent } from './labour-card.component'

describe('LabourCardComponent (plan 729, 749)', () => {
  let fixture: ComponentFixture<LabourCardComponent>
  let emitted: LabourGroup[]
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)

  function setup(group: LabourGroup = defaultLabour()): void {
    TestBed.configureTestingModule({
      imports: [LabourCardComponent],
      providers: [
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'mp_labour_employer_cost' ? 'מעביד: {{amount}}' : k) }
        }
      ]
    })
    fixture = TestBed.createComponent(LabourCardComponent)
    emitted = []
    fixture.componentInstance.groupChange.subscribe((g) => emitted.push(g))
    fixture.componentRef.setInput('group', group)
    fixture.detectChanges()
  }
  const open = (id: string) => {
    byId<HTMLButtonElement>(`${id}-chip`)!.click()
    fixture.detectChanges()
  }
  const type = (id: string, value: string) => {
    const input = byId<HTMLInputElement>(id)!
    input.value = value
    input.dispatchEvent(new Event('input'))
  }

  it('has no mode radios; the factor box is always there, at 1.25', async () => {
    setup()
    await fixture.whenStable()
    expect(el().querySelector('input[type="radio"]')).toBeNull()
    expect(byId('lc-mode-employer')).toBeNull()
    expect(byId('lc-mode-gross')).toBeNull()
    expect(byId<HTMLInputElement>('lc-factor')!.value).toBe('1.25')
    expect(byId('lc-plan-chip')).not.toBeNull()
    expect(byId('lc-actual-chip')).not.toBeNull()
    expect(byId('lc-note')!.textContent).toContain('mp_labour_note_gross')
  })

  it('shows the employer cost for both sides, «לא הוזן» when the gross is empty', () => {
    setup()
    expect(byId('lc-employer-plan')!.textContent).toContain('מעביד: mp_not_entered')
    expect(byId('lc-employer-actual')!.textContent).toContain('מעביד: mp_not_entered')
  })

  it('the employer cost is gross × factor and follows the factor', () => {
    setup({ mode: 'gross', factor: 1.25, plan: 0, actual: 40000 })
    expect(byId('lc-employer-plan')!.textContent).toContain('מעביד: ₪0.00')
    expect(byId('lc-employer-actual')!.textContent).toContain('מעביד: ₪50,000.00')
    fixture.componentRef.setInput('group', { mode: 'gross', factor: 1.3, plan: 0, actual: 40000 })
    fixture.detectChanges()
    expect(byId('lc-employer-actual')!.textContent).toContain('מעביד: ₪52,000.00')
  })

  it('typing emits the whole group; the factor stays inside 1–2', () => {
    setup()
    open('lc-actual')
    type('lc-actual', '40000')
    expect(emitted.at(-1)).toEqual({ mode: 'gross', factor: 1.25, plan: null, actual: 40000 })
    type('lc-factor', '5')
    expect(emitted.at(-1)!.factor).toBe(2)
    type('lc-factor', '0.5')
    expect(emitted.at(-1)!.factor).toBe(1)
  })

  it('an emptied box is null, a typed 0 stays 0', () => {
    setup({ ...defaultLabour(), actual: 5 })
    open('lc-actual')
    type('lc-actual', '')
    expect(emitted.at(-1)!.actual).toBeNull()
    type('lc-actual', '0')
    expect(emitted.at(-1)!.actual).toBe(0)
  })
})
