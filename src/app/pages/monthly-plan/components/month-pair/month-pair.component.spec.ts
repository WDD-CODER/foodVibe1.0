import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslationService } from '@services/translation.service'
import { MonthPairComponent, type PairSide } from './month-pair.component'

const HINT = 'מולא אוטומטית מהתחזית. הקלידו כדי לשנות.'

describe('MonthPairComponent (plan 749)', () => {
  let fixture: ComponentFixture<MonthPairComponent>
  let plans: (number | null)[]
  let actuals: (number | null)[]
  let left: PairSide[]
  const el = () => fixture.nativeElement as HTMLElement
  const byId = <T extends HTMLElement>(id: string) => el().querySelector<T>(`[data-testid="${id}"]`)
  const chip = (side: PairSide) => byId<HTMLButtonElement>(`p-${side}-chip`)!
  const box = (side: PairSide) => byId<HTMLInputElement>(`p-${side}`)
  const press = (side: PairSide) => {
    chip(side).click()
    fixture.detectChanges()
  }
  const settle = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  function setup(inputs: Record<string, unknown> = {}): void {
    TestBed.configureTestingModule({
      imports: [MonthPairComponent],
      providers: [
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'mp_from_forecast_hint' ? HINT : k) }
        }
      ]
    })
    fixture = TestBed.createComponent(MonthPairComponent)
    plans = []
    actuals = []
    left = []
    fixture.componentInstance.planChange.subscribe((v) => plans.push(v))
    fixture.componentInstance.actualChange.subscribe((v) => actuals.push(v))
    fixture.componentInstance.boxLeave.subscribe((v) => left.push(v))
    for (const [name, value] of Object.entries({ labelKey: 'row', idPrefix: 'p', ...inputs }))
      fixture.componentRef.setInput(name, value)
    // Attached so that focus works.
    document.body.appendChild(fixture.nativeElement)
    fixture.detectChanges()
  }

  afterEach(() => fixture.nativeElement.remove())

  it('starts with both sides closed as gray chips', () => {
    setup()
    for (const side of ['plan', 'actual'] as const) {
      expect(chip(side).getAttribute('aria-expanded')).toBe('false')
      expect(chip(side).classList).toContain('c-chip--tap')
      expect(chip(side).classList).not.toContain('teal')
      expect(box(side)).toBeNull()
    }
    expect(chip('plan').textContent!.trim()).toBe('mp_chip_plan')
    expect(chip('actual').textContent!.trim()).toBe('mp_actual')
  })

  it('a press opens that side only and focuses its box', () => {
    setup()
    press('actual')
    expect(chip('actual').getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(box('actual'))
    expect(box('plan')).toBeNull()
  })

  it('a press on the small chip closes the box and keeps the value', async () => {
    setup({ plan: 12000 })
    press('plan')
    await settle()
    expect(box('plan')!.value).toBe('12000')
    expect(chip('plan').textContent!.trim()).toBe('mp_chip_plan')
    press('plan')
    expect(box('plan')).toBeNull()
    expect(chip('plan').textContent!.trim()).toBe('mp_chip_plan · ₪12,000.00')
    expect(plans).toEqual([])
    press('plan')
    await settle()
    expect(box('plan')!.value).toBe('12000')
  })

  it('opening a filled box selects its value, so typing replaces it', async () => {
    setup({ plan: 12000, actual: 0 })
    for (const side of ['plan', 'actual'] as const) {
      press(side)
      await settle()
      // Types at the caret, as a keyboard does: a selected value is replaced, an unselected one is added to.
      document.execCommand('insertText', false, '30000')
      expect(box(side)!.value).toBe('30000')
    }
    expect(plans).toEqual([30000])
    expect(actuals).toEqual([30000])
  })

  it('Escape in the box closes it, reports that it was left and returns to the chip', () => {
    setup()
    press('actual')
    box('actual')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    fixture.detectChanges()
    expect(box('actual')).toBeNull()
    expect(left).toEqual(['actual'])
    expect(document.activeElement).toBe(chip('actual'))
  })

  it('typing emits the number, an emptied box emits null and 0 stays 0', () => {
    setup()
    press('plan')
    for (const value of ['500', '', '0']) {
      box('plan')!.value = value
      box('plan')!.dispatchEvent(new Event('input'))
    }
    expect(plans).toEqual([500, null, 0])
    expect(actuals).toEqual([])
  })

  it('has the teal tone only when filled, with the amount after the label', () => {
    setup({ plan: 0, actual: null })
    expect(chip('plan').classList).toContain('teal')
    expect(chip('plan').textContent).toContain('₪0.00')
    expect(chip('actual').classList).not.toContain('teal')
  })

  it('a filled chip keeps the teal background while its box is open', () => {
    setup({ plan: 100 })
    chip('plan').style.transition = 'none'
    chip('actual').style.transition = 'none'
    const filled = getComputedStyle(chip('plan')).backgroundColor
    expect(filled).not.toBe(getComputedStyle(chip('actual')).backgroundColor)
    press('plan')
    expect(getComputedStyle(chip('plan')).backgroundColor).toBe(filled)
  })

  it('shows the forecast faded in an empty actual box, with the hint, and emits nothing', async () => {
    setup({ plan: 12000 })
    press('actual')
    await settle()
    const input = box('actual')!
    expect(input.value).toBe('')
    expect(input.placeholder).toBe('12,000')
    expect(input.title).toBe(HINT)
    expect(el().querySelector('#' + input.getAttribute('aria-describedby'))!.textContent).toContain(HINT)
    input.dispatchEvent(new Event('blur'))
    expect(actuals).toEqual([])
    expect(chip('actual').classList).not.toContain('teal')
  })

  it('a forecast of 0 is shown faded as 0; no forecast leaves «לא הוזן» and no hint', () => {
    setup({ plan: 0 })
    press('actual')
    expect(box('actual')!.placeholder).toBe('0')
    fixture.componentRef.setInput('plan', null)
    fixture.detectChanges()
    expect(box('actual')!.placeholder).toBe('mp_not_entered')
    expect(box('actual')!.getAttribute('title')).toBeNull()
    expect(box('actual')!.getAttribute('aria-describedby')).toBeNull()
  })

  it('a filled actual box carries no forecast hint', async () => {
    setup({ plan: 12000, actual: 9000 })
    press('actual')
    await settle()
    expect(box('actual')!.value).toBe('9000')
    expect(box('actual')!.getAttribute('title')).toBeNull()
  })

  it('sides "actual" has no forecast chip and no faded value', () => {
    setup({ sides: 'actual', plan: 100 })
    expect(byId('p-plan-chip')).toBeNull()
    press('actual')
    expect(box('actual')!.placeholder).toBe('mp_not_entered')
  })

  it('a closed month shows the values and its chips do not open', () => {
    setup({ plan: 100, actual: null, disabled: true })
    expect(chip('plan').textContent).toContain('₪100.00')
    expect(chip('plan').disabled).toBeTrue()
    expect(chip('actual').disabled).toBeTrue()
    press('plan')
    press('actual')
    expect(box('plan')).toBeNull()
    expect(box('actual')).toBeNull()
  })

  it('the open box is short: about seven digits wide', () => {
    setup()
    press('actual')
    expect(box('actual')!.offsetWidth).toBeGreaterThan(40)
    expect(box('actual')!.offsetWidth).toBeLessThan(110)
  })
})
