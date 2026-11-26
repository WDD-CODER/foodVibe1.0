import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, input, output, signal, WritableSignal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { RestaurantMenuPage } from './restaurant-menu.page'
import { MenuDishDialogComponent } from './components/menu-dish-dialog/menu-dish-dialog.component'
import { PartialCostBadgeComponent } from 'src/app/shared/partial-cost-badge/partial-cost-badge.component'
import { MenuDishDataService } from '@services/menu-dish-data.service'
import { MenuDishCostService, type MenuDishCost } from '@services/menu-dish-cost.service'
import { PermissionService } from '@services/permission.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import type { MenuDish } from '@models/menu-dish.model'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({ selector: 'app-menu-dish-dialog', standalone: true, template: '<div data-testid="dialog-stub"></div>' })
class DialogStub {
  readonly dish = input<MenuDish | null>(null)
  readonly closed = output<void>()
}

@Component({
  selector: 'app-partial-cost-badge',
  standalone: true,
  template: '<span data-testid="partial-badge"></span>'
})
class BadgeStub {
  readonly missing = input<unknown[]>([])
}

const dish = (_id: string, extra: Partial<MenuDish> = {}): MenuDish =>
  ({
    _id,
    name: 'מנה ' + _id,
    costSource: 'typed',
    typedCost: 10,
    priceWithVat: 118,
    active: true,
    ...extra
  }) as MenuDish

describe('RestaurantMenuPage (plan 725)', () => {
  let fixture: ComponentFixture<RestaurantMenuPage>
  let dishes_: WritableSignal<MenuDish[]>
  let loadFailed_: WritableSignal<boolean>
  let data: jasmine.SpyObj<MenuDishDataService>
  let confirm: jasmine.SpyObj<ConfirmModalService>

  const el = (): HTMLElement => fixture.nativeElement
  const rows = () => Array.from(el().querySelectorAll('[data-testid="menu-dish-row"]')) as HTMLElement[]
  const flush = async () => {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const costOf = (d: MenuDish): MenuDishCost => {
    if (d.costSource === 'units') return { state: 'units', costPerPortion: null, missing: [] }
    if (d.costSource === 'recipe') {
      return { state: 'partial', costPerPortion: 4, missing: [{ kind: 'unpriced', name: 'x', recipeIds: [] }] }
    }
    return { state: 'costed', costPerPortion: d.typedCost ?? 0, missing: [] }
  }

  async function setup(list: MenuDish[], opts: { staff?: boolean } = {}): Promise<void> {
    dishes_ = signal(list)
    loadFailed_ = signal(false)
    data = Object.assign(jasmine.createSpyObj('MenuDishDataService', ['load', 'updateDish']), {
      allDishes_: dishes_,
      loadFailed_
    }) as unknown as jasmine.SpyObj<MenuDishDataService>
    data.load.and.resolveTo()
    data.updateDish.and.callFake((d: MenuDish) => {
      dishes_.update((l) => l.map((x) => (x._id === d._id ? d : x)))
      return Promise.resolve(d)
    })
    confirm = jasmine.createSpyObj('ConfirmModalService', ['open'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    const cost = {
      costOf,
      netPrice: (d: MenuDish) => (d.priceWithVat == null ? null : d.priceWithVat / 1.18),
      leftPerDish: (d: MenuDish) => {
        const { state, costPerPortion } = costOf(d)
        if (state !== 'costed' || d.priceWithVat == null) return null
        return Math.round((d.priceWithVat / 1.18 - costPerPortion!) * 100) / 100
      }
    }
    TestBed.configureTestingModule({
      imports: [RestaurantMenuPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        { provide: MenuDishDataService, useValue: data },
        { provide: MenuDishCostService, useValue: cost },
        { provide: PermissionService, useValue: { isStaff_: signal(!!opts.staff) } },
        { provide: MetadataRegistryService, useValue: { courses_: signal([{ key: 'starter' }, { key: 'main' }]) } },
        { provide: BusinessService, useValue: { business_: signal(null) } },
        { provide: TranslationService, useValue: translation },
        { provide: ConfirmModalService, useValue: confirm },
        {
          provide: UserMsgService,
          useValue: jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
        }
      ]
    })
    TestBed.overrideComponent(RestaurantMenuPage, {
      remove: { imports: [MenuDishDialogComponent, PartialCostBadgeComponent] },
      add: { imports: [DialogStub, BadgeStub] }
    })
    fixture = TestBed.createComponent(RestaurantMenuPage)
    fixture.detectChanges()
    await flush()
  }

  it('staff see only the owner-only notice, no rows and no data request', async () => {
    await setup([dish('1')], { staff: true })
    expect(el().querySelector('[data-testid="restaurant-menu-owner-only"]')?.textContent).toContain(
      'restaurant_menu_owner_only'
    )
    expect(rows().length).toBe(0)
    expect(data.load).not.toHaveBeenCalled()
  })

  it('an empty menu says so and offers the add button', async () => {
    await setup([])
    expect(el().textContent).toContain('restaurant_menu_empty')
    expect(rows().length).toBe(0)
  })

  it('a row shows the price, the net price, the cost and what is left', async () => {
    await setup([dish('1')])
    expect(rows().length).toBe(1)
    const row = rows()[0]
    expect(row.querySelector('[data-testid="menu-dish-price"]')?.textContent).toContain('118')
    expect(row.querySelector('[data-testid="menu-dish-net"]')?.textContent?.trim()).toBe('₪100.00')
    expect(row.querySelector('[data-testid="menu-dish-cost"]')?.textContent).toContain('10')
    expect(row.querySelector('[data-testid="menu-dish-left"]')?.textContent).toContain('90')
  })

  it('a partial dish shows the badge and «לא מלא»; a units dish shows «ללא עלות»', async () => {
    await setup([dish('1', { costSource: 'recipe', recipeId: 'r' }), dish('2', { costSource: 'units' })])
    const [partial, units] = rows()
    expect(partial.querySelector('[data-testid="partial-badge"]')).not.toBeNull()
    expect(partial.querySelector('[data-testid="menu-dish-left"]')?.textContent).toContain('menu_dish_left_unknown')
    expect(units.querySelector('[data-testid="menu-dish-cost"]')?.textContent).toContain('menu_dish_no_cost')
    expect(units.querySelector('[data-testid="menu-dish-left"]')?.textContent).toContain('menu_dish_left_unknown')
  })

  it('rows follow the course order, then the name; the search filters by name', async () => {
    await setup([
      dish('1', { name: 'ב', course: 'main' }),
      dish('2', { name: 'א', course: 'main' }),
      dish('3', { name: 'ת', course: 'starter' })
    ])
    expect(rows().map((r) => r.querySelector('.rm-row__cell--name')?.textContent?.trim())).toEqual(['ת', 'א', 'ב'])
    ;(fixture.componentInstance as unknown as { searchQuery_: WritableSignal<string> }).searchQuery_.set('ב')
    fixture.detectChanges()
    expect(rows().length).toBe(1)
  })

  it('the add button opens the dish popup', async () => {
    await setup([dish('1')])
    ;(el().querySelector('[data-testid="menu-dish-add"]') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="dialog-stub"]')).not.toBeNull()
  })

  it('remove: cancel keeps the dish; confirm sets active false; the removed toggle lists it and restore brings it back', async () => {
    await setup([dish('1')])
    const remove = () => (el().querySelector('[data-testid="menu-dish-remove"]') as HTMLButtonElement).click()
    confirm.open.and.resolveTo(false)
    remove()
    await flush()
    expect(data.updateDish).not.toHaveBeenCalled()
    expect(rows().length).toBe(1)

    confirm.open.and.resolveTo(true)
    remove()
    await flush()
    expect(data.updateDish).toHaveBeenCalledWith(jasmine.objectContaining({ _id: '1', active: false }))
    expect(rows().length).toBe(0)

    ;(el().querySelector('[data-testid="menu-dish-show-removed"]') as HTMLInputElement).click()
    await flush()
    expect(rows().length).toBe(1)
    ;(el().querySelector('[data-testid="menu-dish-restore"]') as HTMLButtonElement).click()
    await flush()
    expect(data.updateDish).toHaveBeenCalledWith(jasmine.objectContaining({ _id: '1', active: true }))
  })

  // Plan 748: filters in the panel, plain titles and numbers, a profit percent column, icon actions.

  const chip = (label: string): HTMLInputElement => {
    const chips = Array.from(el().querySelectorAll('.filter-panel [data-testid="menu-dish-type-chip"]'))
    return chips.find((c) => c.textContent?.trim() === label)!.querySelector('input')!
  }
  const names = () => rows().map((r) => r.querySelector('.rm-row__cell--name')?.textContent?.trim())
  const clearButton = () => el().querySelector('[data-testid="menu-dish-clear-filters"]') as HTMLButtonElement | null
  /** Categories start collapsed when the test frame is tablet width or narrower. */
  const openTypes = () => {
    if (el().querySelector('[data-testid="menu-dish-type-chip"]')) return
    ;(el().querySelector('[data-testid="menu-dish-type-category"]') as HTMLButtonElement).click()
    fixture.detectChanges()
  }
  const typed = [
    dish('1', { name: 'א', course: 'starter' }),
    dish('2', { name: 'ב', course: 'main' }),
    dish('3', { name: 'ג' })
  ]

  it('the type chips and the removed toggle sit in the filter panel, not in the column titles', async () => {
    await setup(typed)
    openTypes()
    expect(el().querySelector('.rm-row__filters')).toBeNull()
    expect(el().querySelector('.table-header input')).toBeNull()
    expect(el().querySelector('.table-header .c-chip')).toBeNull()
    const panel = el().querySelector('.filter-panel')!
    expect(panel.querySelector('[data-testid="menu-dish-show-removed"]')).not.toBeNull()
    expect(
      Array.from(panel.querySelectorAll('[data-testid="menu-dish-type-chip"]')).map((c) => c.textContent?.trim())
    ).toEqual(['starter', 'main', 'menu_dish_no_type'])
  })

  it('the sliders button opens and closes the filter panel', async () => {
    localStorage.removeItem('list-panel:restaurant-menu')
    await setup(typed)
    const toggle = el().querySelector('.open-panel-btn') as HTMLButtonElement
    const before = toggle.getAttribute('aria-expanded')
    toggle.click()
    fixture.detectChanges()
    expect(toggle.getAttribute('aria-expanded')).not.toBe(before)
    localStorage.removeItem('list-panel:restaurant-menu')
  })

  it('picking two types lists both, «ללא סוג מנה» lists dishes with no type, «נקה סינון» lists all again', async () => {
    await setup(typed)
    openTypes()
    expect(clearButton()).toBeNull()
    chip('starter').click()
    chip('main').click()
    fixture.detectChanges()
    expect(names()).toEqual(['א', 'ב'])
    expect(el().querySelector('.c-filter-category-count')?.textContent?.trim()).toBe('2')
    chip('starter').click()
    chip('main').click()
    chip('menu_dish_no_type').click()
    fixture.detectChanges()
    expect(names()).toEqual(['ג'])
    clearButton()!.click()
    fixture.detectChanges()
    expect(names()).toEqual(['א', 'ב', 'ג'])
    expect(chip('menu_dish_no_type').checked).toBeFalse()
    expect(el().querySelector('.c-filter-category-count')).toBeNull()
    expect(clearButton()).toBeNull()
  })

  it('«נקה סינון» also turns the removed toggle off', async () => {
    await setup([dish('1'), dish('2', { active: false })])
    const removed = () => el().querySelector('[data-testid="menu-dish-show-removed"]') as HTMLInputElement
    removed().click()
    fixture.detectChanges()
    expect(names()).toEqual(['מנה 2'])
    clearButton()!.click()
    fixture.detectChanges()
    expect(removed().checked).toBeFalse()
    expect(names()).toEqual(['מנה 1'])
  })

  it('a filter that matches nothing says so', async () => {
    await setup([dish('1', { course: 'main' }), dish('2', { course: 'starter', active: false })])
    openTypes()
    chip('starter').click()
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="restaurant-menu-no-match"]')).not.toBeNull()
  })

  it('a picked type that no dish uses any more is dropped from the filter', async () => {
    await setup(typed)
    openTypes()
    chip('main').click()
    fixture.detectChanges()
    expect(names()).toEqual(['ב'])
    dishes_.set(typed.filter((d) => d.course !== 'main'))
    fixture.detectChanges()
    expect(names()).toEqual(['א', 'ג'])
    expect(clearButton()).toBeNull()
  })

  it('the column titles are the new ones and the VAT note is the hint of the net title', async () => {
    await setup([dish('1')])
    const titles = Array.from(el().querySelectorAll('.table-header .c-grid-header-cell'))
    expect(titles.map((t) => t.textContent?.trim())).toEqual([
      'menu_dish_name',
      'menu_dish_col_type',
      'menu_dish_price_with_vat',
      'menu_dish_col_net',
      'menu_dish_cost_per_portion',
      'menu_dish_col_profit',
      'menu_dish_col_profit_pct',
      ''
    ])
    expect(titles[3].getAttribute('title')).toBe('restaurant_menu_vat_note')
    expect(el().textContent).not.toContain('restaurant_menu_vat_note')
  })

  it('net 100 and cost 25: the net is a number only, profit 75 and profit percent 75.0%', async () => {
    await setup([dish('1', { typedCost: 25 })])
    const cell = (id: string) => rows()[0].querySelector(`[data-testid="${id}"]`)?.textContent?.trim()
    expect(cell('menu-dish-net')).not.toContain('menu_dish_net_price')
    expect(cell('menu-dish-net')).toBe('₪100.00')
    expect(cell('menu-dish-left')).toBe('₪75.00')
    expect(cell('menu-dish-profit-pct')).toBe('75.0%')
  })

  it('the profit percent says «לא מלא» for a priced dish with no full cost, and «—» without a price', async () => {
    await setup([
      dish('1', { name: 'א', costSource: 'recipe', recipeId: 'r' }),
      dish('2', { name: 'ב', costSource: 'units' }),
      dish('3', { name: 'ג', priceWithVat: undefined })
    ])
    expect(rows().map((r) => r.querySelector('[data-testid="menu-dish-profit-pct"]')?.textContent?.trim())).toEqual([
      'menu_dish_left_unknown',
      'menu_dish_left_unknown',
      '—'
    ])
  })

  it('each row has an edit and a remove icon button, a removed dish a restore icon', async () => {
    await setup([dish('1'), dish('2', { active: false })])
    const expectIcon = (testId: string, icon: string, label: string) => {
      const button = rows()[0].querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement
      expect(button.classList).withContext(testId).toContain('c-icon-btn')
      expect(button.querySelector('lucide-icon')?.getAttribute('name')).withContext(testId).toBe(icon)
      expect(button.textContent?.trim()).withContext(testId).toBe('')
      expect(button.getAttribute('aria-label')).withContext(testId).toBe(label)
    }
    expectIcon('menu-dish-edit', 'pencil', 'edit')
    expectIcon('menu-dish-remove', 'trash-2', 'menu_dish_remove')
    expect(rows()[0].querySelector('[data-testid="menu-dish-remove"]')?.classList).toContain('danger')
    ;(rows()[0].querySelector('[data-testid="menu-dish-edit"]') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="dialog-stub"]')).not.toBeNull()
    ;(el().querySelector('[data-testid="menu-dish-show-removed"]') as HTMLInputElement).click()
    fixture.detectChanges()
    expectIcon('menu-dish-restore', 'rotate-ccw', 'menu_dish_restore')
    expect(rows()[0].querySelector('[data-testid="menu-dish-remove"]')).toBeNull()
  })

  it('a failed load shows the error with a retry that loads again', async () => {
    await setup([])
    loadFailed_.set(true)
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="restaurant-menu-error"]')?.textContent).toContain(
      'restaurant_menu_load_failed'
    )
    ;(el().querySelector('[data-testid="restaurant-menu-retry"]') as HTMLButtonElement).click()
    await flush()
    expect(data.load).toHaveBeenCalledTimes(2)
  })
})
