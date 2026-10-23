import { ComponentFixture, TestBed } from '@angular/core/testing'
import { FormBuilder, type FormGroup } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { MenuDishRowComponent } from './menu-dish-row.component'
import { EventPlanService } from '../../../../core/engine/event-plan.service'
import { TranslationService } from '@services/translation.service'
import { RecipeCostService } from '@services/recipe-cost.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ProductDataService } from '@services/product-data.service'
import { PermissionService } from '@services/permission.service'
import type { Recipe } from '@models/recipe.model'
import type { MissingItem } from 'src/app/core/engine/event-plan.types'
import { computed, signal } from '@angular/core'

const missing_ = signal<MissingItem[]>([])

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
          provide: RecipeCostService,
          useValue: {
            computeRecipeCostStatus: () => ({ cost: 0, partial: missing_().length > 0, missing: missing_() })
          }
        },
        {
          provide: KitchenStateService,
          useValue: { productsById_: computed(() => new Map()), recipesById_: computed(() => new Map()) }
        },
        { provide: ProductDataService, useValue: { updateProduct: () => Promise.resolve() } },
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

  it('shows portions without a float tail', () => {
    fixture.componentRef.setInput('portionInfo', { portions: 110.00000000000001, coefficient: 1.1, overridden: false })
    fixture.detectChanges()
    const value = (fixture.nativeElement as HTMLElement).querySelector('.dish-portions-value')!
    expect(value.textContent?.trim()).toBe('110')
    fixture.componentRef.setInput('portionInfo', { portions: 5.25, coefficient: 1, overridden: false })
    fixture.detectChanges()
    expect(value.textContent?.trim()).toBe('5.25')
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

describe('MenuDishRowComponent partial badge (plan 444)', () => {
  it('shows the חלקי badge only while the dish has a missing price', async () => {
    missing_.set([{ kind: 'unpriced', productId: 'oil', name: 'שמן', recipeIds: ['r1'] }])
    await TestBed.configureTestingModule({
      imports: [MenuDishRowComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: EventPlanService, useValue: { costFor: () => ({ cost: 0, partial: false }) } },
        {
          provide: RecipeCostService,
          useValue: { computeRecipeCostStatus: () => ({ cost: 0, partial: true, missing: missing_() }) }
        },
        {
          provide: KitchenStateService,
          useValue: { productsById_: computed(() => new Map()), recipesById_: computed(() => new Map()) }
        },
        { provide: ProductDataService, useValue: { updateProduct: () => Promise.resolve() } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
    const group = TestBed.inject(FormBuilder).group({
      recipeId: ['r1'],
      recipeType: ['dish'],
      sell_price: [0],
      food_cost_money: [0],
      serving_portions: [1],
      coefficient_override: [null as number | null]
    })
    const fixture = TestBed.createComponent(MenuDishRowComponent)
    fixture.componentRef.setInput('itemGroup', group)
    fixture.componentRef.setInput('sectionIndex', 0)
    fixture.componentRef.setInput('itemIndex', 0)
    fixture.componentRef.setInput('recipes', [{ _id: 'r1', nameHebrew: 'סלט', ingredients: [] } as unknown as Recipe])
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('.partial-chip')).not.toBeNull()
    missing_.set([])
    fixture.componentRef.setInput('recipes', [{ _id: 'r1', nameHebrew: 'סלט', ingredients: [] } as unknown as Recipe])
    fixture.detectChanges()
    expect(el.querySelector('.partial-chip')).toBeNull()
  })
})

describe('MenuDishRowComponent money for staff (plan 487)', () => {
  let fixture: ComponentFixture<MenuDishRowComponent>
  const isStaff = signal(false)
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement

  beforeEach(async () => {
    missing_.set([{ kind: 'unpriced', productId: 'oil', name: 'שמן', recipeIds: ['r1'] }])
    await TestBed.configureTestingModule({
      imports: [MenuDishRowComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: EventPlanService, useValue: { costFor: () => ({ cost: 40, partial: false }) } },
        {
          provide: RecipeCostService,
          useValue: { computeRecipeCostStatus: () => ({ cost: 0, partial: true, missing: missing_() }) }
        },
        {
          provide: KitchenStateService,
          useValue: { productsById_: computed(() => new Map()), recipesById_: computed(() => new Map()) }
        },
        { provide: ProductDataService, useValue: { updateProduct: () => Promise.resolve() } },
        { provide: PermissionService, useValue: { isStaff_: isStaff } },
        { provide: TranslationService, useValue: { translate: (k: string) => k } }
      ]
    }).compileComponents()
  })

  afterEach(() => missing_.set([]))

  function create(staff: boolean): void {
    isStaff.set(staff)
    const group = TestBed.inject(FormBuilder).group({
      recipeId: ['r1'],
      recipeType: ['dish'],
      sell_price: [55],
      food_cost_money: [0],
      food_cost_pct: [30],
      serving_portions: [1],
      coefficient_override: [null as number | null]
    })
    fixture = TestBed.createComponent(MenuDishRowComponent)
    fixture.componentRef.setInput('itemGroup', group)
    fixture.componentRef.setInput('sectionIndex', 0)
    fixture.componentRef.setInput('itemIndex', 0)
    fixture.componentRef.setInput('isMetaExpanded', true)
    fixture.componentRef.setInput('activeFields', [
      'sell_price',
      'food_cost_money',
      'food_cost_pct',
      'serving_portions'
    ])
    fixture.componentRef.setInput('portionInfo', { portions: 50, coefficient: 1, overridden: false })
    fixture.componentRef.setInput('recipes', [{ _id: 'r1', nameHebrew: 'סלט', ingredients: [] } as unknown as Recipe])
    fixture.detectChanges()
  }

  it('staff: no sell price, no cost badge, no food cost fields; coefficient and portions stay', () => {
    create(true)
    const text = el().textContent ?? ''
    expect(el().querySelector('.dish-sell-price')).toBeNull()
    expect(el().querySelector('app-partial-cost-badge')).toBeNull()
    expect(text).not.toContain('dish_food_cost_per_portion')
    expect(text).not.toContain('dish_food_cost_money')
    expect(text).not.toContain('dish_food_cost_pct')
    expect(text).not.toContain('₪')
    expect(el().querySelector('.dish-coefficient-input')).not.toBeNull()
    expect(text).toContain('event_portions')
    expect(el().querySelectorAll('.dish-data .dish-field').length).toBe(3)
  })

  it('owner: the price box, the badge and every money field show as before', () => {
    create(false)
    const text = el().textContent ?? ''
    expect(el().querySelector('.dish-sell-price')).not.toBeNull()
    expect(el().querySelector('app-partial-cost-badge')).not.toBeNull()
    expect(text).toContain('dish_food_cost_per_portion')
    expect(text).toContain('dish_food_cost_money')
    expect(text).toContain('dish_food_cost_pct')
    expect(el().querySelectorAll('.dish-data .dish-field').length).toBe(7)
  })
})
