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
        { provide: PermissionService, useValue: { can: () => canEditMoney } },
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

  it('marks every number partial when the plan is partial', () => {
    create(event({ pricePerGuest: 200 }), plan({ partial: true }))
    expect(fixture.nativeElement.querySelectorAll('.partial-tag').length).toBeGreaterThanOrEqual(4)
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
    const price = fixture.nativeElement.querySelector('input[formControlName="pricePerGuest"]') as HTMLInputElement
    expect(price.disabled).toBeFalse()
    expect(fixture.nativeElement.querySelector('input[formControlName="profitTargetPct"]')).toBeNull()
    ;(fixture.nativeElement.querySelector('.targets-toggle') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('input[formControlName="profitTargetPct"]')).toBeTruthy()
  })

  it('shows the error under an extra cost below 0', () => {
    create(event())
    const form = fixture.componentInstance.moneyForm()
    form.controls.extraCostAmount.setValue(-1)
    form.controls.extraCostAmount.markAsTouched()
    fixture.detectChanges()
    expect(text()).toContain('extra_costs_negative')
  })

  it('the phone summary line expands on tap', () => {
    create(event({ pricePerGuest: 200 }))
    const root = fixture.nativeElement.querySelector('.pricing-meter') as HTMLElement
    expect(root.classList.contains('expanded')).toBeFalse()
    ;(fixture.nativeElement.querySelector('.meter-summary') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(root.classList.contains('expanded')).toBeTrue()
  })
})
