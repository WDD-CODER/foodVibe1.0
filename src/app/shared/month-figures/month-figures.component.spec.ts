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

  function render(i: MonthInput, words: Record<string, string> = {}): void {
    TestBed.configureTestingModule({
      imports: [MonthFiguresComponent],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => words[k] ?? k } }]
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

  describe('plan 749: what «חלקי» is missing', () => {
    const el = () => fixture.nativeElement as HTMLElement
    const partial = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"] [data-testid="mf-partial"]`)!
    const partly = input({
      revenue: { plan: 100000, actual: 90000 },
      fixed: { plan: null, actual: 300, entered: 1, lines: 2 }
    })

    it('a partial cell lists the missing inputs of its own column', () => {
      render(partly, { mp_missing: 'חסר: {{list}}' })
      expect(partial('mf-plan-profit').title).toBe('חסר: mp_missing_plan_labour, mp_missing_plan_fixed')
      // The actual food cost is filled from the forecast (plan 759), so only labour is missing.
      expect(partial('mf-actual-profit').title).toBe('חסר: mp_missing_labour')
    })

    it('adds the fixed lines hint and describes the tag with the same text', () => {
      render(partly)
      fixture.componentRef.setInput('fixedHint', 'לא הוזנו בפועל: חשמל, מים')
      fixture.detectChanges()
      const tag = partial('mf-actual-profit')
      expect(tag.title).toContain('לא הוזנו בפועל: חשמל, מים')
      const described = el().querySelector('#' + tag.getAttribute('aria-describedby'))!
      expect(described.textContent).toBe(tag.title)
    })

    it('the completeness badge carries what the actual column is missing', () => {
      render(partly)
      const badge = el().querySelector<HTMLElement>('[data-testid="mf-badge"]')!
      expect(badge.title).toBe('mp_missing')
      expect(el().querySelector('#' + badge.getAttribute('aria-describedby'))!.textContent).toContain('mp_missing')
    })
  })

  describe('plan 759: figures from the forecast', () => {
    const WORDS = { mp_actual_from_forecast: 'מהתחזית — עוד לא הוזן בפועל' }
    const el = () => fixture.nativeElement as HTMLElement
    const money = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"] .mf__money`)!
    const tip = () => document.body.querySelector('.c-tooltip')
    const onlyRevenue = input({
      revenue: { plan: 120000, actual: 100000 },
      labour: { plan: 40000, actual: null, estimate: false },
      fixed: { plan: 20000, actual: null, entered: 0, lines: 1 }
    })

    afterEach(() => {
      fixture.destroy()
      fixture.nativeElement.remove()
    })

    it('a filled cell is faded and the shared tooltip says it is from the forecast', () => {
      render(onlyRevenue, WORDS)
      document.body.appendChild(fixture.nativeElement)
      for (const key of ['foodCost', 'labour', 'fixed', 'primeCost', 'profit']) {
        const cell = money(`mf-actual-${key}`)
        expect(cell.classList).withContext(key).toContain('mf__money--forecast')
        expect(cell.tabIndex).withContext(key).toBe(0)
      }
      const labour = money('mf-actual-labour')
      expect(labour.textContent!.trim()).toBe('₪40,000.00')
      expect(labour.getAttribute('title')).toBeNull()
      labour.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
      labour.click()
      expect(tip()?.textContent).toContain('מהתחזית')
      expect(text('mf-actual-profit')).not.toContain('mp_partial')
    })

    it('a typed actual renders plain, with no hint; so does the forecast column', () => {
      render(onlyRevenue, WORDS)
      document.body.appendChild(fixture.nativeElement)
      for (const id of ['mf-actual-revenue', 'mf-plan-labour', 'mf-plan-profit']) {
        const cell = money(id)
        expect(cell.classList).withContext(id).not.toContain('mf__money--forecast')
        expect(cell.getAttribute('tabindex')).withContext(id).toBeNull()
        cell.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
        cell.click()
        expect(tip()).withContext(id).toBeNull()
      }
    })

    it('the faded figure takes the placeholder colour, also when it is negative', () => {
      render(
        input({
          revenue: { plan: null, actual: 1000 },
          labour: { plan: 5000, actual: null, estimate: false }
        })
      )
      const host = fixture.nativeElement as HTMLElement
      document.body.appendChild(host)
      host.style.setProperty('--color-text-muted-light', 'rgb(1, 2, 3)')
      host.style.setProperty('--color-text-main', 'rgb(4, 5, 6)')
      host.style.setProperty('--color-danger', 'rgb(7, 8, 9)')
      expect(money('mf-actual-labour').classList).toContain('mf__money--forecast')
      expect(getComputedStyle(money('mf-actual-labour')).color).toBe('rgb(1, 2, 3)')
      expect(money('mf-actual-profit').classList).toContain('mf__money--neg')
      expect(getComputedStyle(money('mf-actual-profit')).color).toBe('rgb(1, 2, 3)')
      expect(getComputedStyle(money('mf-actual-revenue')).color).toBe('rgb(4, 5, 6)')
    })
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
