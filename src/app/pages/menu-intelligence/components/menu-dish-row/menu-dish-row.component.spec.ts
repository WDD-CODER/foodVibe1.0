import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormBuilder, type FormGroup } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { MenuDishRowComponent } from './menu-dish-row.component'
import { EventPlanService } from '../../../../core/engine/event-plan.service'
import { TranslationService } from '@services/translation.service'

describe('MenuDishRowComponent coefficient (plan 441)', () => {
  let fixture: ComponentFixture<MenuDishRowComponent>
  let component: MenuDishRowComponent
  let group: FormGroup

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? ''
  const box = (): HTMLInputElement => (fixture.nativeElement as HTMLElement).querySelector('.dish-coefficient-input')!
  const type = (value: string): void => {
    const el = box()
    el.value = value
    el.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuDishRowComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: EventPlanService, useValue: { costFor: () => ({ cost: 0, partial: false }) } },
        {
          provide: TranslationService,
          useValue: { translate: (k: string) => (k === 'per_diner_in_unit' ? '{{unit}} לסועד' : k) }
        }
      ]
    }).compileComponents()
    group = TestBed.inject(FormBuilder).group({
      recipeId: ['r1'],
      recipeType: ['dish'],
      sell_price: [0],
      food_cost_money: [0],
      serving_portions: [1],
      coefficient_override: [null as number | null]
    })
    fixture = TestBed.createComponent(MenuDishRowComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('itemGroup', group)
    fixture.componentRef.setInput('sectionIndex', 0)
    fixture.componentRef.setInput('itemIndex', 0)
    fixture.componentRef.setInput('isMetaExpanded', true)
    fixture.componentRef.setInput('activeFields', ['serving_portions'])
    fixture.componentRef.setInput('portionInfo', { portions: 127, coefficient: 1.265, overridden: false })
    fixture.detectChanges()
  })

  it('shows the default coefficient with two decimals and the portions', () => {
    expect(box().value).toBe('1.27')
    expect(text()).toContain('event_portions')
    expect(text()).toContain('127')
    expect(text()).not.toContain('coefficient_manual')
  })

  it('typing 1.1 sets coefficient_override and shows the manual tag and reset button', () => {
    type('1.1')
    expect(group.get('coefficient_override')?.value).toBe(1.1)
    fixture.componentRef.setInput('portionInfo', { portions: 110, coefficient: 1.1, overridden: true })
    fixture.detectChanges()
    expect(text()).toContain('coefficient_manual')
    expect(text()).toContain('coefficient_reset')
    expect(text()).toContain('110')
  })

  it('the reset button clears the override', () => {
    group.patchValue({ coefficient_override: 1.1 })
    fixture.componentRef.setInput('portionInfo', { portions: 110, coefficient: 1.1, overridden: true })
    fixture.detectChanges()
    const reset = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dish-coefficient-reset')!
    reset.click()
    expect(group.get('coefficient_override')?.value).toBeNull()
  })

  it('typing 1.111 shows the invalid message and keeps the old value', () => {
    group.patchValue({ coefficient_override: 1.1 })
    type('1.111')
    expect(group.get('coefficient_override')?.value).toBe(1.1)
    expect(text()).toContain('coefficient_invalid')
  })

  it('typing 0 shows the invalid message and keeps the old value', () => {
    type('0')
    expect(group.get('coefficient_override')?.value).toBeNull()
    expect(text()).toContain('coefficient_invalid')
    component.onCoefficientBlur()
    fixture.detectChanges()
    expect(text()).not.toContain('coefficient_invalid')
    expect(box().value).toBe('1.27')
  })

  it('warns when portions per diner is 0', () => {
    group.patchValue({ serving_portions: 0 })
    fixture.componentRef.setInput('portionInfo', { portions: 0, coefficient: 1.265, overridden: false })
    fixture.detectChanges()
    expect(text()).toContain('portions_per_diner_zero')
  })

  it('labels a preparation per diner in its yield unit', () => {
    group.patchValue({ recipeType: 'preparation', recipeId: 'p1' })
    fixture.componentRef.setInput('recipes', [{ _id: 'p1', nameHebrew: 'רוטב', yieldUnit: 'liter' }])
    fixture.detectChanges()
    expect(component.getFieldLabel('serving_portions')).toBe('liter לסועד')
  })
})
