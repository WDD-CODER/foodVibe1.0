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
      leftPerDish: (d: MenuDish) =>
        costOf(d).state === 'costed' && d.priceWithVat != null ? d.priceWithVat / 1.18 - (d.typedCost ?? 0) : null
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
    expect(row.querySelector('[data-testid="menu-dish-net"]')?.textContent).toContain('100')
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
    for (const row of [partial, units]) {
      const pct = row.querySelector('[data-testid="menu-dish-profit-pct"]')
      expect(pct?.textContent?.trim()).toBe('menu_dish_left_unknown')
    }
  })

  // ── plan 748 ──────────────────────────────────────────────────────────────

  const panel = () => el().querySelector('.filter-panel') as HTMLElement
  const names = () => rows().map((r) => r.querySelector('.rm-row__cell--name')?.textContent?.trim())
  const cellText = (row: HTMLElement, id: string) =>
    row.querySelector(`[data-testid="menu-dish-${id}"]`)?.textContent?.trim()
  const clearButton = () => panel().querySelector('[data-testid="menu-dish-clear-filters"]') as HTMLButtonElement | null
  /** The type category starts closed on a narrow screen: open it before reaching for its chips. */
  const openTypes = () => {
    const header = panel().querySelector('[data-testid="menu-dish-type-category"]') as HTMLButtonElement
    if (header.getAttribute('aria-expanded') !== 'true') header.click()
    fixture.detectChanges()
  }
  const chipLabels = () =>
    Array.from(panel().querySelectorAll('.c-chip--toggle span')).map((s) => s.textContent?.trim())
  const pick = async (label: string) => {
    const chip = Array.from(panel().querySelectorAll('.c-chip--toggle')).find(
      (c) => c.textContent?.trim() === label
    ) as HTMLElement
    ;(chip.querySelector('input') as HTMLInputElement).click()
    await flush()
  }
  const typedDishes = () => [
    dish('1', { name: 'א', course: 'starter' }),
    dish('2', { name: 'ב', course: 'main' }),
    dish('3', { name: 'ג' })
  ]

  it('the type chips and the removed toggle sit in the filter panel, not above the column titles', async () => {
    await setup(typedDishes())
    openTypes()
    expect(el().querySelector('.rm-row__filters')).toBeNull()
    expect(el().querySelector('.table-header input[type="checkbox"]')).toBeNull()
    expect(el().querySelector('.table-header .c-chip')).toBeNull()
    expect(chipLabels()).toEqual(['starter', 'main', 'menu_dish_no_type', 'menu_dish_show_removed'])
    expect(panel().querySelector('[data-testid="menu-dish-show-removed"]')).not.toBeNull()
  })

  it('picking two types lists both, «ללא סוג מנה» lists the dishes with no type, «נקה סינון» lists all', async () => {
    await setup(typedDishes())
    openTypes()
    expect(clearButton()).toBeNull()
    await pick('starter')
    expect(names()).toEqual(['א'])
    await pick('main')
    expect(names()).toEqual(['א', 'ב'])
    expect(panel().querySelector('.c-filter-category-count')?.textContent?.trim()).toBe('2')
    await pick('starter')
    await pick('main')
    await pick('menu_dish_no_type')
    expect(names()).toEqual(['ג'])
    clearButton()!.click()
    await flush()
    expect(names()).toEqual(['א', 'ב', 'ג'])
    expect(clearButton()).toBeNull()
    expect(panel().querySelector('.c-filter-category-count')).toBeNull()
  })

  it('«נקה סינון» also turns the removed toggle off; a filter that matches nothing says so', async () => {
    await setup(typedDishes())
    ;(panel().querySelector('[data-testid="menu-dish-show-removed"]') as HTMLInputElement).click()
    await flush()
    expect(el().querySelector('[data-testid="restaurant-menu-no-match"]')).not.toBeNull()
    clearButton()!.click()
    await flush()
    expect((panel().querySelector('[data-testid="menu-dish-show-removed"]') as HTMLInputElement).checked).toBeFalse()
    expect(rows().length).toBe(3)
  })

  it('a picked type that no dish uses any more leaves the filter', async () => {
    await setup(typedDishes())
    openTypes()
    await pick('main')
    dishes_.update((list) => list.filter((d) => d.course !== 'main'))
    await flush()
    await flush()
    expect(names()).toEqual(['א', 'ג'])
    expect(clearButton()).toBeNull()
  })

  it('the sliders button opens and closes the filter panel', async () => {
    await setup(typedDishes())
    const wasClosed = panel().classList.contains('collapsed')
    ;(el().querySelector('.open-panel-btn') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(panel().classList.contains('collapsed')).toBe(!wasClosed)
    ;(el().querySelector('.open-panel-btn') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(panel().classList.contains('collapsed')).toBe(wasClosed)
  })

  it('the column titles are plain and the VAT note is the hint of the net price title', async () => {
    await setup([dish('1')])
    const titles = Array.from(el().querySelectorAll('.table-header .c-grid-header-cell'))
      .map((c) => c.textContent?.trim())
      .filter((t) => !!t)
    expect(titles).toEqual([
      'menu_dish_name',
      'menu_dish_col_type',
      'menu_dish_price_with_vat',
      'menu_dish_col_net',
      'menu_dish_cost_per_portion',
      'menu_dish_col_profit',
      'menu_dish_col_profit_pct'
    ])
    expect(el().querySelector('[data-testid="menu-dish-net-title"]')?.getAttribute('title')).toBe(
      'restaurant_menu_vat_note'
    )
    expect(el().textContent).not.toContain('restaurant_menu_vat_note')
  })

  it('net 100 and cost 25: the net is a number only, profit 75 and 75.0% in its own column', async () => {
    await setup([dish('1', { typedCost: 25 })])
    const row = rows()[0]
    expect(cellText(row, 'net')).not.toContain('menu_dish_net_price')
    expect(cellText(row, 'net')).toMatch(/^[^a-z_]*100[^a-z_]*$/)
    expect(cellText(row, 'left')).toContain('75')
    expect(cellText(row, 'left')).not.toContain('%')
    expect(cellText(row, 'profit-pct')).toBe('75.0%')
  })

  it('a dish with no price shows «—» for the profit and its percent', async () => {
    await setup([dish('1', { priceWithVat: undefined })])
    expect(cellText(rows()[0], 'left')).toBe('—')
    expect(cellText(rows()[0], 'profit-pct')).toBe('—')
  })

  it('each row has icon buttons to edit and remove; a removed dish has a restore icon', async () => {
    await setup([dish('1'), dish('2', { active: false })])
    const button = (id: string) => rows()[0].querySelector(`[data-testid="menu-dish-${id}"]`) as HTMLButtonElement
    const icon = (id: string) => button(id).querySelector('lucide-icon')?.getAttribute('name')
    expect(button('edit').classList).toContain('c-icon-btn')
    expect(icon('edit')).toBe('pencil')
    expect(button('edit').getAttribute('aria-label')).toBe('edit')
    expect(button('edit').textContent?.trim()).toBe('')
    expect(button('remove').classList).toContain('danger')
    expect(icon('remove')).toBe('trash-2')
    expect(button('remove').getAttribute('title')).toBe('menu_dish_remove')
    expect(button('remove').textContent?.trim()).toBe('')
    expect(button('restore')).toBeNull()

    button('edit').click()
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="dialog-stub"]')).not.toBeNull()

    ;(panel().querySelector('[data-testid="menu-dish-show-removed"]') as HTMLInputElement).click()
    await flush()
    expect(button('remove')).toBeNull()
    expect(icon('restore')).toBe('rotate-ccw')
    expect(button('restore').getAttribute('title')).toBe('menu_dish_restore')
    expect(button('restore').textContent?.trim()).toBe('')
  })

  it('the desktop actions column is wide enough for the two row icons', async () => {
    await setup([dish('1')])
    const shell = el().querySelector('app-list-shell') as HTMLElement
    const lastTrack = shell.style.getPropertyValue('--list-grid').split(' ').pop()!
    expect(lastTrack).toMatch(/rem$/)
    // Two 2.25rem icon buttons, their 0.25rem gap and the actions cell's 1rem padding.
    expect(parseFloat(lastTrack)).toBeGreaterThanOrEqual(2 * 2.25 + 0.25 + 1)
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
