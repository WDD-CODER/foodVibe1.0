import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { monthFigures, type MonthInput } from '../../core/engine/month-plan'
import { MonthFiguresComponent } from './month-figures.component'

const targets = { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25, profitPct: 10 }
const input = (over: Partial<MonthInput> = {}): MonthInput => ({
  revenue: { plan: null, actual: null },
  foodCost: { plan: null, actual: null },
  labour: { plan: null, actual: null, estimate: false },
  fixed: { plan: null, actual: null, entered: 0, lines: 0 },
  targets,
  vatRatePct: 18,
  dealerType: 'murshe',
  ...over
})

describe('MonthFiguresComponent (plan 728)', () => {
  let fixture: ComponentFixture<MonthFiguresComponent>
  const text = (id: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`)?.textContent ?? ''

  function render(i: MonthInput): void {
    TestBed.configureTestingModule({
      imports: [MonthFiguresComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k } }]
    })
    fixture = TestBed.createComponent(MonthFiguresComponent)
    fixture.componentRef.setInput('figures', monthFigures(i))
    fixture.componentRef.setInput('targets', targets)
    fixture.detectChanges()
  }

  it('shows not entered for every missing actual and the plan profit as partial', () => {
    render(input({ revenue: { plan: 100000, actual: null } }))
    expect(text('mf-badge')).toContain('mp_completeness')
    expect(text('mf-actual-revenue')).toContain('mp_not_entered')
    expect(text('mf-actual-foodCost')).toContain('mp_not_entered')
    expect(text('mf-actual-profit')).toContain('mp_not_entered')
    expect(text('mf-plan-profit')).toContain('mp_partial')
    expect(text('mf-plan-foodCost')).toContain('mp_from_target')
    expect(text('mf-missing')).toContain('mp_missing')
  })

  it('an entered 0 counts as entered: money 0 and percents are dashes', () => {
    render(input({ revenue: { plan: null, actual: 0 } }))
    expect(text('mf-actual-revenue')).toContain('₪0.00')
    expect(text('mf-actual-foodCost')).toContain('mp_not_entered')
    const f = fixture.componentInstance.figures()
    expect(f.completeness.entered).toBe(1)
    expect(text('mf-actual-revenue')).not.toContain('mp_not_entered')
  })

  it('a negative profit uses the error class and an actual percent carries its band tag', () => {
    render(
      input({
        revenue: { plan: null, actual: 1000 },
        foodCost: { plan: null, actual: 320 },
        labour: { plan: null, actual: 900, estimate: false },
        fixed: { plan: null, actual: 300, entered: 1, lines: 1 }
      })
    )
    const cell = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="mf-actual-profit"] .mf__money')!
    expect(cell.classList).toContain('mf__money--neg')
    expect(text('mf-actual-foodCost')).toContain('mp_in_band')
    expect(text('mf-actual-labour')).toContain('mp_out_of_band')
  })
})
