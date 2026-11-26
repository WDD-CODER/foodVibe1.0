import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Component, input, output, signal, WritableSignal } from '@angular/core'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { LucideAngularModule } from 'lucide-angular'
import { DishSalesPage } from './dish-sales.page'
import { ReturnReasonsDialogComponent } from './components/return-reasons-dialog/return-reasons-dialog.component'
import { MenuDishDataService } from '@services/menu-dish-data.service'
import { DishSalesMonthDataService } from '@services/dish-sales-month-data.service'
import { PermissionService } from '@services/permission.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { TranslationService } from '@services/translation.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import type { MenuDish } from '@models/menu-dish.model'
import type { DishSalesMonth, DishSalesRow, DishReturnReasonLine } from '@models/dish-sales-month.model'
import { currentMonthKey } from 'src/app/core/utils/month-key.util'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  selector: 'app-return-reasons-dialog',
  standalone: true,
  template:
    '<button data-testid="stub-confirm" (click)="confirmed.emit([{ reason: \'guest_returned\', count: 2 }])"></button>'
})
class DialogStub {
  readonly dishName = input<string>('')
  readonly returned = input<number>(0)
  readonly reasons = input<readonly DishReturnReasonLine[]>([])
  readonly confirmed = output<DishReturnReasonLine[]>()
  readonly closed = output<void>()
}

const TEXT: Record<string, string> = {
  dish_sales_progress: 'הוזנו {{done}} מתוך {{total}} מנות · נמכרו {{sold}} · הוחזרו {{returned}}',
  dish_sales_reasons_count: 'סיבות ({{given}}/{{returned}})',
  dish_sales_zero_fill_confirm: 'לסמן {{n}} מנות כ־0 שנמכרו?',
  dish_sales_closed_banner: 'החודש נסגר ב־{{date}}; העלויות קפואות'
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

const row = (
  id: string,
  sold: number | null,
  returned: number | null,
  reasons: DishReturnReasonLine[] = []
): DishSalesRow => ({
  menuDishId: id,
  nameSnapshot: 'מנה ' + id,
  sold,
  returned,
  returnReasons: reasons,
  source: 'typed'
})

describe('DishSalesPage (plan 726)', () => {
  let fixture: ComponentFixture<DishSalesPage>
  let dishes_: WritableSignal<MenuDish[]>
  let stored_: WritableSignal<DishSalesMonth | undefined>
  let loadFailed_: WritableSignal<boolean>
  let months: jasmine.SpyObj<DishSalesMonthDataService>
  let userMsg: jasmine.SpyObj<UserMsgService>
  let query_: BehaviorSubject<ReturnType<typeof convertToParamMap>>
  let navigate: jasmine.Spy

  const month = currentMonthKey()
  const el = (): HTMLElement => fixture.nativeElement
  const rows = () => Array.from(el().querySelectorAll('[data-testid="dish-sales-row"]')) as HTMLElement[]
  const box = (i: number, field: 'sold' | 'returned') =>
    rows()[i].querySelector(`input[data-testid="dish-sales-${field}"]`) as HTMLInputElement
  const flush = async () => {
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const type = async (i: number, field: 'sold' | 'returned', value: string) => {
    const input = box(i, field)
    input.value = value
    input.dispatchEvent(new Event('input'))
    await flush()
  }
  const saveButton = () => el().querySelector('[data-testid="dish-sales-save"]') as HTMLButtonElement | null
  const sentRows = (): DishSalesRow[] => months.saveMonth.calls.mostRecent().args[1]

  async function setup(
    list: MenuDish[],
    opts: { staff?: boolean; stored?: Partial<DishSalesMonth>; query?: Record<string, string> } = {}
  ): Promise<void> {
    dishes_ = signal(list)
    stored_ = signal(opts.stored ? ({ _id: 'm1', month, rows: [], ...opts.stored } as DishSalesMonth) : undefined)
    const dishData = Object.assign(jasmine.createSpyObj('MenuDishDataService', ['load']), {
      allDishes_: dishes_,
      loadFailed_: signal(false)
    }) as unknown as jasmine.SpyObj<MenuDishDataService>
    ;(dishData.load as jasmine.Spy).and.resolveTo()
    loadFailed_ = signal(false)
    months = Object.assign(jasmine.createSpyObj('DishSalesMonthDataService', ['load', 'saveMonth', 'monthOf']), {
      loadFailed_
    }) as unknown as jasmine.SpyObj<DishSalesMonthDataService>
    months.load.and.resolveTo()
    months.monthOf.and.callFake(() => stored_())
    months.saveMonth.and.callFake(async (_k: string, rs: DishSalesRow[]) => {
      const saved = { _id: 'm1', month, rows: rs } as DishSalesMonth
      stored_.set(saved)
      return saved
    })
    userMsg = jasmine.createSpyObj('UserMsgService', ['onSetSuccessMsg', 'onSetErrorMsg'])
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => TEXT[k ?? ''] ?? k ?? '')
    query_ = new BehaviorSubject(convertToParamMap(opts.query ?? {}))
    TestBed.configureTestingModule({
      imports: [DishSalesPage, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideRouter([]),
        { provide: MenuDishDataService, useValue: dishData },
        { provide: DishSalesMonthDataService, useValue: months },
        { provide: PermissionService, useValue: { isStaff_: signal(!!opts.staff) } },
        { provide: MetadataRegistryService, useValue: { courses_: signal([]) } },
        { provide: TaxonomyStore, useValue: { loadSafely: () => Promise.resolve() } },
        { provide: TranslationService, useValue: translation },
        { provide: ConfirmModalService, useValue: { open: () => Promise.resolve(true) } },
        { provide: UserMsgService, useValue: userMsg },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: query_.value }, queryParamMap: query_.asObservable() }
        }
      ]
    })
    TestBed.overrideComponent(DishSalesPage, {
      remove: { imports: [ReturnReasonsDialogComponent] },
      add: { imports: [DialogStub] }
    })
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    fixture = TestBed.createComponent(DishSalesPage)
    fixture.detectChanges()
    await flush()
    await flush()
  }

  it('staff see only the owner-only notice and nothing is requested', async () => {
    await setup([dish('1')], { staff: true })
    expect(el().querySelector('[data-testid="dish-sales-owner-only"]')?.textContent).toContain(
      'restaurant_menu_owner_only'
    )
    expect(rows().length).toBe(0)
    expect(months.load).not.toHaveBeenCalled()
  })

  it('an empty box saves null and a typed 0 saves 0', async () => {
    await setup([dish('1'), dish('2')])
    await type(0, 'sold', '3')
    await type(1, 'sold', '0')
    saveButton()!.click()
    await flush()
    expect(months.saveMonth).toHaveBeenCalledTimes(1)
    const sent = sentRows()
    const first = sent.find((r) => r.menuDishId === '1')!
    const second = sent.find((r) => r.menuDishId === '2')!
    expect(first.sold).toBe(3)
    expect(first.returned).toBeNull()
    expect(second.sold).toBe(0)
    expect(second.returned).toBeNull()
    expect(first.source).toBe('typed')
    expect(first.nameSnapshot).toBe('מנה 1')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('dish_sales_saved')
  })

  it('a dish with nothing typed and no reasons sends no row', async () => {
    await setup([dish('1'), dish('2'), dish('3')])
    await type(0, 'sold', '4')
    saveButton()!.click()
    await flush()
    expect(sentRows().map((r) => r.menuDishId)).toEqual(['1'])
  })

  it('the progress line counts typed dishes only (0 counts, empty does not)', async () => {
    await setup([dish('1'), dish('2'), dish('3'), dish('4')])
    await type(0, 'sold', '5')
    await type(0, 'returned', '1')
    await type(1, 'sold', '2')
    await type(3, 'sold', '0')
    expect(el().querySelector('[data-testid="dish-sales-progress"]')?.textContent).toContain(
      'הוזנו 3 מתוך 4 מנות · נמכרו 7 · הוחזרו 1'
    )
  })

  it('reason counts above returned block the save', async () => {
    await setup([dish('1')], { stored: { rows: [row('1', 5, 3, [{ reason: 'guest_returned', count: 3 }])] } })
    expect(saveButton()!.disabled).toBeFalse()
    await type(0, 'returned', '1')
    expect(saveButton()!.disabled).toBeTrue()
    saveButton()!.click()
    await flush()
    expect(months.saveMonth).not.toHaveBeenCalled()
    const reasons = rows()[0].querySelector('[data-testid="dish-sales-reasons"]') as HTMLElement
    expect(reasons.textContent).toContain('סיבות (3/1)')
  })

  it('clearing the returned box drops the reasons and says so', async () => {
    await setup([dish('1')], { stored: { rows: [row('1', 5, 3, [{ reason: 'guest_returned', count: 2 }])] } })
    await type(0, 'returned', '')
    expect(userMsg.onSetSuccessMsg).toHaveBeenCalledWith('dish_sales_reasons_cleared')
    saveButton()!.click()
    await flush()
    expect(sentRows()[0].returned).toBeNull()
    expect(sentRows()[0].returnReasons).toEqual([])
  })

  it('the reasons button shows only after something came back; confirming puts the reasons on the row', async () => {
    await setup([dish('1'), dish('2')])
    const button = () => rows()[0].querySelector('[data-testid="dish-sales-reasons"]') as HTMLButtonElement
    expect(button()).toBeNull()
    await type(0, 'returned', '0')
    expect(button()).toBeNull()
    await type(0, 'returned', '2')
    expect(button().textContent).toContain('סיבות (0/2)')
    await type(0, 'returned', '')
    expect(button()).toBeNull()
    await type(0, 'returned', '3')
    expect(rows()[1].querySelector('[data-testid="dish-sales-reasons"]')).toBeNull()
    button().click()
    await flush()
    ;(el().querySelector('[data-testid="stub-confirm"]') as HTMLButtonElement).click()
    await flush()
    expect(button().textContent).toContain('סיבות (2/3)')
    saveButton()!.click()
    await flush()
    expect(sentRows()[0].returnReasons).toEqual([{ reason: 'guest_returned', count: 2 }])
  })

  it('a stored month opens with its numbers and the untyped dish stays empty', async () => {
    await setup([dish('1'), dish('2'), dish('3')], { stored: { rows: [row('1', 8, 2), row('2', 0, null)] } })
    expect(box(0, 'sold').value).toBe('8')
    expect(box(0, 'returned').value).toBe('2')
    expect(box(1, 'sold').value).toBe('0')
    expect(box(1, 'returned').value).toBe('')
    expect(box(2, 'sold').value).toBe('')
    expect(box(2, 'sold').placeholder).toBe('dish_sales_not_entered')
  })

  it('a month with closedAt opens read-only with no save button, a banner, the month pager and no cost', async () => {
    await setup([dish('1')], {
      stored: {
        rows: [row('1', 8, 2)],
        closedAt: Date.UTC(2026, 10, 30),
        frozen: {
          at: 1,
          vatRatePct: 18,
          dealerType: 'murshe',
          dishes: [
            {
              menuDishId: '1',
              name: 'מנה 1',
              priceWithVat: 118,
              costPerPortion: 42,
              costSource: 'typed',
              partial: false
            }
          ]
        } as DishSalesMonth['frozen']
      }
    })
    expect(saveButton()).toBeNull()
    expect(box(0, 'sold').disabled).toBeTrue()
    expect(el().querySelector('[data-testid="dish-sales-closed"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="dish-sales-months"]')).not.toBeNull()
    expect(el().querySelector('[data-testid="dish-sales-cost"]')).toBeNull()
    expect(el().textContent).not.toContain('42')
  })

  it('an inactive dish stays listed only when the month has a row for it', async () => {
    await setup([dish('1'), dish('2', { active: false }), dish('3', { active: false })], {
      stored: { rows: [row('2', 1, null)] }
    })
    expect(rows().length).toBe(2)
    expect(rows()[1].textContent).toContain('dish_sales_removed_dish')
  })

  it('a stored row of a dish that is no longer listed is kept when the month is saved', async () => {
    await setup([dish('1')], { stored: { rows: [row('gone', 4, null)] } })
    await type(0, 'sold', '2')
    saveButton()!.click()
    await flush()
    expect(
      sentRows()
        .map((r) => r.menuDishId)
        .sort()
    ).toEqual(['1', 'gone'])
  })

  it('a failed save keeps the numbers and shows the message', async () => {
    await setup([dish('1')])
    months.saveMonth.and.rejectWith(new Error('down'))
    await type(0, 'sold', '3')
    saveButton()!.click()
    await flush()
    expect(userMsg.onSetErrorMsg).toHaveBeenCalledWith('dish_sales_save_failed')
    expect(box(0, 'sold').value).toBe('3')
  })

  it('typed numbers count as unsaved until the save works', async () => {
    await setup([dish('1')])
    expect(fixture.componentInstance.hasRealChanges()).toBeFalse()
    await type(0, 'sold', '3')
    expect(fixture.componentInstance.hasRealChanges()).toBeTrue()
    saveButton()!.click()
    await flush()
    expect(fixture.componentInstance.hasRealChanges()).toBeFalse()
  })

  it('the month arrows go through the route; forward is off at this month and a future month opens this month', async () => {
    await setup([dish('1')], { query: { month: '2999-01' } })
    const next = el().querySelector('[data-testid="dish-sales-next"]') as HTMLButtonElement
    expect(next.disabled).toBeTrue()
    ;(el().querySelector('[data-testid="dish-sales-prev"]') as HTMLButtonElement).click()
    expect(navigate).toHaveBeenCalledTimes(1)
    const params = navigate.calls.mostRecent().args[1].queryParams as { month: string }
    expect(params.month < month).toBeTrue()
  })

  // Plan 748: the arrows existed but «שמירה» was drawn on top of them, so a `.click()` test passed anyway.
  // The real list shell and page header are laid out here and the point a finger would hit is asked for.
  for (const width of [1200, 375]) {
    it(`at ${width}px the month arrows, fill-zero and save are each what is hit at their own point`, async () => {
      await setup([dish('1')], { query: { month: '2000-01' } })
      Object.assign(el().style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: `${Math.min(width, window.innerWidth)}px`,
        zIndex: '2147483647'
      })
      fixture.detectChanges()
      for (const id of ['dish-sales-prev', 'dish-sales-next', 'dish-sales-zero-fill', 'dish-sales-save']) {
        const button = el().querySelector(`[data-testid="${id}"]`) as HTMLButtonElement
        const box = button.getBoundingClientRect()
        expect(box.width).withContext(id).toBeGreaterThan(0)
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        expect(button.contains(hit)).withContext(id).toBeTrue()
      }
    })
  }

  it('the month pager sits above the column titles and stays when loading failed, with a hint on each arrow', async () => {
    await setup([dish('1')])
    const pager = () => el().querySelector('.table-pagination [data-testid="dish-sales-months"]')
    expect(pager()?.classList).toContain('c-pagination-controls')
    const prev = el().querySelector('[data-testid="dish-sales-prev"]') as HTMLButtonElement
    const next = el().querySelector('[data-testid="dish-sales-next"]') as HTMLButtonElement
    expect(prev.getAttribute('title')).toBe('dish_sales_prev_month')
    expect(next.getAttribute('title')).toBe('dish_sales_next_month')
    loadFailed_.set(true)
    fixture.detectChanges()
    expect(el().querySelector('[data-testid="dish-sales-error"]')).not.toBeNull()
    expect(pager()).not.toBeNull()
  })

  it('no cost column and no cost line, on an open month', async () => {
    await setup([dish('1')])
    expect(el().querySelector('[data-testid="dish-sales-cost"]')).toBeNull()
    expect(el().querySelector('[data-testid="dish-sales-cost-live"]')).toBeNull()
    expect(el().textContent).not.toContain('menu_dish_cost_per_portion')
    expect(el().querySelector('.table-header')?.textContent).toContain('menu_dish_col_type')
  })

  it('no dishes shows the empty message with a link to the menu', async () => {
    await setup([])
    expect(el().textContent).toContain('restaurant_menu_empty')
    expect(el().querySelector('[data-testid="dish-sales-empty-link"]')).not.toBeNull()
  })
})
