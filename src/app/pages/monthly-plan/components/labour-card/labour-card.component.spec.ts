import { ComponentFixture, TestBed } from '@angular/core/testing'
import { defaultLabour, type LabourGroup } from '@schemas/month/month-rules'
import { TranslationService } from '@services/translation.service'
import { LabourCardComponent } from './labour-card.component'

describe('LabourCardComponent (plan 729)', () => {
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
          useValue: { translate: (k: string) => (k === 'mp_labour_estimate' ? '{{amount}} ₪ (הערכה)' : k) }
        }
      ]
    })
    fixture = TestBed.createComponent(LabourCardComponent)
    emitted = []
    fixture.componentInstance.groupChange.subscribe((g) => emitted.push(g))
    fixture.componentRef.setInput('group', group)
    fixture.detectChanges()
  }
  const type = (id: string, value: string) => {
    const input = byId<HTMLInputElement>(id)!
    input.value = value
    input.dispatchEvent(new Event('input'))
  }

  it('employer mode: two boxes, no factor and no estimate line', () => {
    setup()
    expect(byId('lc-plan')).not.toBeNull()
    expect(byId('lc-actual')).not.toBeNull()
    expect(byId('lc-factor')).toBeNull()
    expect(byId('lc-estimate-actual')).toBeNull()
    expect(byId('lc-note')!.textContent).toContain('mp_labour_note')
  })

  it('gross mode: 40000 × 1.25 shows «50,000 ₪ (הערכה)», factor 1.3 shows 52,000', async () => {
    setup({ mode: 'gross', factor: 1.25, plan: null, actual: 40000 })
    await fixture.whenStable()
    expect(byId<HTMLInputElement>('lc-factor')!.value).toBe('1.25')
    expect(byId('lc-estimate-actual')!.textContent).toContain('50,000 ₪ (הערכה)')
    fixture.componentRef.setInput('group', { mode: 'gross', factor: 1.3, plan: null, actual: 40000 })
    fixture.detectChanges()
    expect(byId('lc-estimate-actual')!.textContent).toContain('52,000 ₪ (הערכה)')
  })

  it('switching the mode and typing emit the whole group; the factor stays inside 1–2', () => {
    setup()
    byId<HTMLInputElement>('lc-mode-gross')!.click()
    expect(emitted.at(-1)!.mode).toBe('gross')
    type('lc-actual', '40000')
    expect(emitted.at(-1)!.actual).toBe(40000)
    fixture.componentRef.setInput('group', { ...defaultLabour(), mode: 'gross' })
    fixture.detectChanges()
    type('lc-factor', '5')
    expect(emitted.at(-1)!.factor).toBe(2)
    type('lc-factor', '0.5')
    expect(emitted.at(-1)!.factor).toBe(1)
  })

  it('an emptied box is null, a typed 0 stays 0', () => {
    setup({ ...defaultLabour(), actual: 5 })
    type('lc-actual', '')
    expect(emitted.at(-1)!.actual).toBeNull()
    type('lc-actual', '0')
    expect(emitted.at(-1)!.actual).toBe(0)
  })
})
