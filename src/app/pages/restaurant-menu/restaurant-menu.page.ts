import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { MenuDishDataService } from '@services/menu-dish-data.service'
import { MenuDishCostService } from '@services/menu-dish-cost.service'
import { PermissionService } from '@services/permission.service'
import { MetadataRegistryService } from '@services/metadata-registry.service'
import { BusinessService } from '@services/business.service'
import { TranslationService } from '@services/translation.service'
import { ConfirmModalService } from '@services/confirm-modal.service'
import { UserMsgService } from '@services/user-msg.service'
import type { MenuDish } from '@models/menu-dish.model'
import { normalizeHebrew } from 'src/app/core/utils/recipe-match.util'
import { formatMoney, formatPct1, roundMoney } from 'src/app/core/engine/rounding'
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
import { useCollapsibleCategories } from 'src/app/core/utils/collapsible-categories.util'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { ListShellComponent } from 'src/app/shared/list-shell/list-shell.component'
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { InputClearComponent } from 'src/app/shared/input-clear/input-clear.component'
import { LoaderComponent } from 'src/app/shared/loader/loader.component'
import { RowActionsMenuComponent } from 'src/app/shared/row-actions-menu/row-actions-menu.component'
import { PartialCostBadgeComponent } from 'src/app/shared/partial-cost-badge/partial-cost-badge.component'
import { MenuDishDialogComponent } from './components/menu-dish-dialog/menu-dish-dialog.component'
import { TooltipDirective } from 'src/app/shared/tooltip/tooltip.directive'

/** The type chip that shows dishes with no course. */
export const NO_COURSE = '__none__'

/** Plan 725: the restaurant's standing menu — dishes with price, net price and cost per portion. Owner only. */
@Component({
  selector: 'app-restaurant-menu-page',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    TranslatePipe,
    ListShellComponent,
    EmptyStateComponent,
    InputClearComponent,
    LoaderComponent,
    RowActionsMenuComponent,
    PartialCostBadgeComponent,
    MenuDishDialogComponent,
    TooltipDirective
  ],
  templateUrl: './restaurant-menu.page.html',
  styleUrl: './restaurant-menu.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantMenuPage {
  private readonly data = inject(MenuDishDataService)
  private readonly cost = inject(MenuDishCostService)
  private readonly permission = inject(PermissionService)
  private readonly metadata = inject(MetadataRegistryService)
  private readonly translation = inject(TranslationService)
  private readonly confirmModal = inject(ConfirmModalService)
  private readonly userMsg = inject(UserMsgService)
  private readonly business = inject(BusinessService).business_

  protected readonly isStaff_ = this.permission.isStaff_
  protected readonly noCourse = NO_COURSE
  protected readonly searchQuery_ = signal('')
  /** The picked types (course keys, `NO_COURSE`); empty = every dish. A type no longer offered is dropped. */
  protected readonly courseFilter_ = linkedSignal<string[], ReadonlySet<string>>({
    source: () => this.courseChips_(),
    computation: (offered, previous) =>
      new Set([...(previous?.value ?? [])].filter((key) => key === NO_COURSE || offered.includes(key)))
  })
  protected readonly showRemoved_ = signal(false)
  protected readonly isLoading_ = signal(true)
  protected readonly loadFailed_ = this.data.loadFailed_
  protected readonly isFormOpen_ = signal(false)
  protected readonly editing_ = signal<MenuDish | null>(null)

  private readonly panel_ = useResponsivePanelState('restaurant-menu')
  protected readonly isPanelOpen_ = this.panel_.isPanelOpen_
  protected readonly togglePanel = this.panel_.togglePanel
  protected readonly filterCategories = useCollapsibleCategories()
  protected readonly hasActiveFilters_ = computed(() => this.courseFilter_().size > 0 || this.showRemoved_())

  private readonly isPatur_ = computed(() => this.business()?.settings?.dealerType === 'patur')

  /** The VAT note, the hint of the net price column title: the rate, or «עוסק פטור». */
  protected readonly vatNote_ = computed(() => {
    if (this.isPatur_()) return this.translation.translate('restaurant_menu_vat_none')
    return this.translation
      .translate('restaurant_menu_vat_rate')
      .replace('{{rate}}', String(this.business()?.settings?.vatRatePct ?? 18))
  })

  private readonly courseOrder_ = computed(() => this.metadata.courses_().map((c) => c.key))

  protected readonly dishes_ = computed(() => this.data.allDishes_().filter((d) => !d.deletedAt))
  protected readonly isEmptyList_ = computed(() => this.dishes_().filter((d) => d.active !== false).length === 0)

  /** The courses some dish uses, in the registry's order. */
  protected readonly courseChips_ = computed(() => {
    const used = new Set(
      this.dishes_()
        .map((d) => d.course)
        .filter((c): c is string => !!c)
    )
    return this.courseOrder_().filter((key) => used.has(key))
  })

  protected readonly rows_ = computed(() => {
    const q = normalizeHebrew(this.searchQuery_().trim())
    const types = this.courseFilter_()
    const order = this.courseOrder_()
    const rank = (c?: string) => {
      const i = c ? order.indexOf(c) : -1
      return i < 0 ? order.length : i
    }
    return this.dishes_()
      .filter((d) => (this.showRemoved_() ? d.active === false : d.active !== false))
      .filter((d) => types.size === 0 || types.has(d.course || NO_COURSE))
      .filter((d) => !q || normalizeHebrew(d.name).includes(q))
      .sort((a, b) => rank(a.course) - rank(b.course) || a.name.localeCompare(b.name, 'he'))
      .map((dish) => {
        const cost = this.cost.costOf(dish)
        const net = this.cost.netPrice(dish)
        const left = this.cost.leftPerDish(dish)
        return {
          dish,
          cost,
          net,
          vatTip: this.vatTip_(dish.priceWithVat, net),
          left,
          profitPct: left != null && net ? formatPct1((left / net) * 100) : null
        }
      })
  })

  constructor() {
    if (!this.isStaff_()) void this.load()
    else this.isLoading_.set(false)
  }

  protected async load(): Promise<void> {
    this.isLoading_.set(true)
    await this.data.load()
    this.isLoading_.set(false)
  }

  protected money(n: number | null): string {
    return n == null ? '—' : formatMoney(n)
  }

  protected courseLabel(key: string | undefined): string {
    return key ? this.translation.translate(key) : ''
  }

  protected toggleType(key: string): void {
    this.courseFilter_.update((set) => {
      const next = new Set(set)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  protected clearFilters(): void {
    this.courseFilter_.set(new Set())
    this.showRemoved_.set(false)
  }

  protected openAdd(): void {
    this.editing_.set(null)
    this.isFormOpen_.set(true)
  }

  protected openEdit(dish: MenuDish): void {
    this.editing_.set(dish)
    this.isFormOpen_.set(true)
  }

  protected closeForm(): void {
    this.isFormOpen_.set(false)
  }

  /** Leaving the menu is `active: false`, after a confirmation; cancel changes nothing. */
  protected async remove(dish: MenuDish): Promise<void> {
    const message = this.translation.translate('menu_dish_remove_confirm').replace('{{name}}', dish.name)
    if (!(await this.confirmModal.open(message, { variant: 'danger' }))) return
    await this.setActive(dish, false)
  }

  protected async restore(dish: MenuDish): Promise<void> {
    await this.setActive(dish, true)
  }

  /** Plan 759: the hint of a dish's net price: its VAT amount; '' (no hint) for a dish without a price. */
  private vatTip_(gross: number | undefined, net: number | null): string {
    if (this.isPatur_()) return this.translation.translate('restaurant_menu_vat_none')
    if (gross == null || net == null) return ''
    return this.translation
      .translate('restaurant_menu_vat_amount')
      .replace('{{amount}}', formatMoney(roundMoney(gross - net)))
  }

  private async setActive(dish: MenuDish, active: boolean): Promise<void> {
    try {
      await this.data.updateDish({ ...dish, active })
    } catch {
      this.userMsg.onSetErrorMsg(this.translation.translate('save_failed'))
    }
  }
}
