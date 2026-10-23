import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormBuilder } from '@angular/forms'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { MenuEvent } from '@models/menu-event.model'
import { BusinessService } from '@services/business.service'
import { PermissionService } from '@services/permission.service'
import { TranslationService } from '@services/translation.service'
import type { EventPlan } from '../../../../core/engine/event-plan.types'
import { createMoneyGroup } from '../../menu-money-form.util'
import { MenuPortionsService } from '../../services/menu-portions.service'
import { PricingMeterComponent } from './pricing-meter.component'

describe('PricingMeterComponent', () => {
  let fixture: ComponentFixture<PricingMeterComponent>
  let canEditMoney: boolean
  let isStaff: boolean

  const plan = (over: Partial<EventPlan> = {}): EventPlan => ({
    rawLines: [],
    prepLines: [],
    dishCosts: [],
    eventFoodCost: 4000,
    partial: false,
    missing: [],
    errors: [],
    ...over
  })
  const event = (over: Partial<MenuEvent> = {}): Omit<MenuEvent, '_id'> => ({
    name: 'x',
    eventType: 'a',
    servingType: 'b',
    guestCount: 50,
    extraCosts: { amount: 1000 },
    sections: [],
    ...over
  })
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? ''

  function create(ev: Omit<MenuEvent, '_id'>, p: EventPlan = plan()) {
    fixture = TestBed.createComponent(PricingMeterComponent)
    fixture.componentRef.setInput('event', ev)
    fixture.componentRef.setInput('plan', p)
    fixture.componentRef.setInput('moneyForm', createMoneyGroup(new FormBuilder()))
    fixture.detectChanges()
  }

  beforeEach(() => {
    canEditMoney = true
    isStaff = false
    TestBed.configureTestingModule({
      imports: [PricingMeterComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MenuPortionsService, useValue: { byItem: () => new Map() } },
        {
          provide: BusinessService,
          useValue: { business_: () => ({ settings: { profitTargetPct: 25, safetyMarginPct: 10 } }) }
        },
        { provide: PermissionService, useValue: { can: () => canEditMoney, isStaff_: () => isStaff } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    })
  })

  it('green verdict when the price meets the target', () => {
    create(event({ pricePerGuest: 200 }))
    expect(fixture.nativeElement.querySelector('.meter-numbers .verdict.ok')?.textContent).toContain('meets_target')
    expect(text()).toContain('₪133.33')
    expect(text()).not.toContain('price_computed')
  })

  it('red verdict with the shortfall per guest when the price is too low', () => {
    create(event({ pricePerGuest: 120 }))
    const bad = fixture.nativeElement.querySelector('.meter-numbers .verdict.bad') as HTMLElement
    expect(bad.textContent).toContain('short_per_guest')
    expect(text()).toContain('16.7%')
  })

  it('an own target of 15 turns the verdict green', () => {
    create(event({ pricePerGuest: 120, targetsOverride: { profitTargetPct: 15 } }))
    expect(fixture.nativeElement.querySelector('.meter-numbers .verdict.ok')).toBeTruthy()
  })

  it('an empty price is tagged as computed', () => {
    create(event({ sections: [] }))
    expect(text()).toContain('price_computed')
  })

  it('shows "—" for the profit % when revenue is 0', () => {
    create(event({ pricePerGuest: 0 }))
    expect(fixture.nativeElement.querySelector('.meter-numbers .verdict')).toBeNull()
    expect(text()).toContain('—')
  })

  it('marks profit per guest, profit % and minimum price partial, never revenue', () => {
    create(event({ pricePerGuest: 200 }), plan({ partial: true }))
    const metrics = Array.from(fixture.nativeElement.querySelectorAll('.fin-metric')) as HTMLElement[]
    const withTag = metrics.filter((m) => m.querySelector('.partial-tag'))
    expect(withTag.length).toBe(3)
    const revenue = metrics.find((m) => m.textContent?.includes('menu_total_revenue'))!
    expect(revenue.querySelector('.partial-tag')).toBeNull()
  })

  it('shows the engine reason and no revenue tag when partial with an empty missing list', () => {
    create(event({ pricePerGuest: 200 }), plan({ partial: true, errors: [{ kind: 'no_yield', name: 'רוטב' }] }))
    expect(fixture.nativeElement.querySelector('.partial-reasons')).toBeTruthy()
    expect(text()).toContain('partial_reason_title')
    expect(text()).toContain('engine_error_no_yield')
    const revenue = (Array.from(fixture.nativeElement.querySelectorAll('.fin-metric')) as HTMLElement[]).find((m) =>
      m.textContent?.includes('menu_total_revenue')
    )!
    expect(revenue.querySelector('.partial-tag')).toBeNull()
  })

  it('shows no reason list when a product is missing or the plan is not partial', () => {
    create(
      event({ pricePerGuest: 200 }),
      plan({
        partial: true,
        errors: [{ kind: 'no_yield', name: 'x' }],
        missing: [{ kind: 'unpriced', name: 'p', recipeIds: [] }]
      })
    )
    expect(fixture.nativeElement.querySelector('.partial-reasons')).toBeNull()
    create(event({ pricePerGuest: 200 }), plan({ partial: false, errors: [{ kind: 'no_yield', name: 'x' }] }))
    expect(fixture.nativeElement.querySelector('.partial-reasons')).toBeNull()
  })

  it('tags revenue as not set when it is 0 with guests', () => {
    create(event({ guestCount: 50, pricePerGuest: undefined }), plan())
    expect(text()).toContain('revenue_not_set')
  })

  it('locks the money inputs without editMoney', () => {
    canEditMoney = false
    create(event({ pricePerGuest: 200 }))
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[]
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs.every((input) => input.disabled)).toBeTrue()
    expect(fixture.nativeElement.querySelector('lucide-icon[name="lock"]')).toBeTruthy()
  })

  it('unlocks the money inputs for the owner and shows the target inputs on demand', () => {
    create(event({ pricePerGuest: 200 }))
    const price = fixture.nativeElement.querySelector('input[name="pricePerGuest"]') as HTMLInputElement
    expect(price.disabled).toBeFalse()
    expect(fixture.nativeElement.querySelector('input[name="profitTargetPct"]')).toBeNull()
    ;(fixture.nativeElement.querySelector('.targets-toggle') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('input[name="profitTargetPct"]')).toBeTruthy()
  })

  it('shows the error under an extra cost below 0', () => {
    create(event())
    const form = fixture.componentInstance.moneyForm()
    form.controls.extraCostAmount.setValue(-1)
    form.controls.extraCostAmount.markAsTouched()
    fixture.detectChanges()
    expect(text()).toContain('extra_costs_negative')
  })

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement
  const chip = (): HTMLButtonElement => root().querySelector('.targets-toggle') as HTMLButtonElement
  const targetBox = (): HTMLInputElement | null => root().querySelector('input[name="profitTargetPct"]')
  const click = (el: HTMLElement): void => {
    el.click()
    fixture.detectChanges()
  }

  describe('staff (plan 487)', () => {
    it('renders nothing of the meter for staff and keeps the money form disabled', () => {
      isStaff = true
      canEditMoney = false
      create(event({ pricePerGuest: 200 }))
      expect(root().querySelector('.pricing-meter')).toBeNull()
      expect(root().querySelector('.pricing-fab')).toBeNull()
      expect(root().querySelector('input')).toBeNull()
      expect(text()).not.toContain(fixture.componentInstance.foodCost_())
      expect(text().trim()).toBe('')
      expect(fixture.componentInstance.moneyForm().disabled).toBeTrue()
    })

    it('renders the bar for the owner and for a signed-out visitor', () => {
      create(event({ pricePerGuest: 200 }))
      expect(root().querySelector('.pricing-meter')).toBeTruthy()
      expect(root().querySelector('.pricing-fab')).toBeTruthy()
      canEditMoney = false
      create(event({ pricePerGuest: 200 }))
      expect(root().querySelector('.pricing-meter input')).toBeTruthy()
      expect(text()).toContain('menu_total_cost')
    })
  })

  describe('target chip (plan 487)', () => {
    it('starts closed even when the event has its own target, then shows and hides the boxes', () => {
      create(event({ pricePerGuest: 120, targetsOverride: { profitTargetPct: 15 } }))
      expect(targetBox()).toBeNull()
      expect(chip().getAttribute('aria-expanded')).toBe('false')
      click(chip())
      expect(targetBox()).toBeTruthy()
      expect(root().querySelector('input[name="safetyMarginPct"]')).toBeTruthy()
      click(chip())
      expect(targetBox()).toBeNull()
      expect(root().querySelector('.meter-numbers .verdict.ok')).toBeTruthy()
    })

    it('is teal exactly when the event holds a target or margin', () => {
      create(event())
      expect(chip().classList.contains('teal')).toBeFalse()
      fixture.componentRef.setInput('event', event({ targetsOverride: { safetyMarginPct: 5 } }))
      fixture.detectChanges()
      expect(chip().classList.contains('teal')).toBeTrue()
      fixture.componentRef.setInput('event', event())
      fixture.detectChanges()
      expect(chip().classList.contains('teal')).toBeFalse()
    })

    it('cannot hide the boxes while a target holds a refused value', () => {
      create(event())
      click(chip())
      const form = fixture.componentInstance.moneyForm()
      form.controls.profitTargetPct.setValue(100)
      fixture.componentRef.setInput('event', event({ targetsOverride: { profitTargetPct: 100 } }))
      fixture.detectChanges()
      click(chip())
      expect(targetBox()).toBeTruthy()
      expect(text()).toContain('target_too_high')
    })
  })

  describe('error slot (plan 487)', () => {
    it('renders each error inside its own field, and the chip sits in a field too', () => {
      create(event())
      click(chip())
      const form = fixture.componentInstance.moneyForm()
      form.controls.profitTargetPct.setValue(100)
      form.controls.extraCostAmount.setValue(-50)
      form.controls.extraCostAmount.markAsTouched()
      fixture.componentRef.setInput('event', event({ targetsOverride: { profitTargetPct: 100 } }))
      fixture.detectChanges()
      const errors = Array.from(root().querySelectorAll('.field-error')) as HTMLElement[]
      expect(errors.length).toBe(2)
      const targetField = targetBox()!.closest('.meter-field')!
      const extraField = root().querySelector('input[name="extraCostAmount"]')!.closest('.meter-field')!
      expect(targetField.querySelector('.field-error')?.textContent).toContain('target_too_high')
      expect(extraField.querySelector('.field-error')?.textContent).toContain('extra_costs_negative')
      expect(chip().parentElement?.classList.contains('meter-field')).toBeTrue()
    })
  })

  describe('phone sheet (plan 487)', () => {
    const sheetCard = (): HTMLElement | null => root().querySelector('app-modal-shell .c-modal-card.m-sheet-card')

    it('the coins button opens the pricing in a bottom sheet', () => {
      create(event({ pricePerGuest: 200 }))
      expect(root().querySelector('app-modal-shell')).toBeNull()
      click(root().querySelector('.pricing-fab') as HTMLButtonElement)
      const card = sheetCard()!
      expect(card).toBeTruthy()
      expect(card.querySelector('h3')?.textContent).toContain('pricing_meter_open')
      expect(card.querySelector('.sheet-summary')?.textContent).toContain('meets_target')
      expect(card.querySelector('.sheet-body input[name="pricePerGuest"]')).toBeTruthy()
      expect(card.querySelector('.sheet-body .meter-numbers')?.textContent).toContain('menu_total_cost')
      expect(card.querySelector('.sheet-body .targets-toggle')).toBeTruthy()
      expect(card.querySelector('.sheet-summary')?.tagName).toBe('DIV')
    })

    it('typing in the sheet updates the form, and the bar shows it after the sheet closes', () => {
      create(event())
      click(root().querySelector('.pricing-fab') as HTMLButtonElement)
      const box = sheetCard()!.querySelector('input[name="pricePerGuest"]') as HTMLInputElement
      box.value = '120'
      box.dispatchEvent(new Event('input'))
      fixture.detectChanges()
      expect(fixture.componentInstance.moneyForm().controls.pricePerGuest.value).toBe(120)
      expect(root().querySelector('.pricing-meter')).toBeNull()
      click(sheetCard()!.querySelector('.sheet-close') as HTMLButtonElement)
      const barBox = root().querySelector('.pricing-meter input[name="pricePerGuest"]') as HTMLInputElement
      expect(barBox.value).toBe('120')
    })

    it('the close button and the shell dismiss close the sheet', () => {
      create(event())
      click(root().querySelector('.pricing-fab') as HTMLButtonElement)
      click(sheetCard()!.querySelector('.sheet-close') as HTMLButtonElement)
      expect(root().querySelector('app-modal-shell')).toBeNull()
      click(root().querySelector('.pricing-fab') as HTMLButtonElement)
      click(root().querySelector('.c-modal-overlay') as HTMLElement)
      expect(root().querySelector('app-modal-shell')).toBeNull()
    })
  })
})
