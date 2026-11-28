import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PermissionService } from '@services/permission.service'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { DisabledWhyDirective } from 'src/app/shared/tooltip/disabled-why.directive'
import { fillSupplierPrices, type SupplierPrices } from './supplier-prices.util'

/**
 * Plan 473: one price box per selected supplier, in chip order. A child component because
 * `product-form.component.ts` is growth-frozen. The first row starts from `seed`, later rows copy it.
 */
@Component({
  selector: 'app-supplier-prices',
  standalone: true,
  imports: [NumberBoxDirective, SelectOnFocusDirective, TranslatePipe, FormFieldComponent, DisabledWhyDirective],
  templateUrl: './supplier-prices.component.html',
  styleUrl: './supplier-prices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierPricesComponent {
  private readonly permission = inject(PermissionService)

  readonly supplierIds = input.required<string[]>()
  /** Supplier name shown on a row. */
  readonly displayFn = input<(id: string) => string>((id) => id)
  readonly prices = input.required<SupplierPrices>()
  /** The product's existing price: where the first row starts. */
  readonly seed = input(0)
  readonly baseUnit = input('')
  /** The whole form is read-only (staff on a product another member created). */
  readonly viewOnly = input(false)
  readonly pricesChange = output<SupplierPrices>()

  /** Why a price cannot be typed (a dictionary key), null when it can. Staff: prices are the owner's job. */
  protected readonly lockWhy_ = computed<string | null>(() => {
    if (this.viewOnly()) return 'view_only_not_yours'
    const moneyLocked = this.permission.isStaff_() && !this.permission.can('editMoney', { type: 'products' })
    return moneyLocked ? 'prices_locked_owner_only' : null
  })

  constructor() {
    // Rows follow the supplier chips: a new supplier gets a row, a removed one loses it.
    effect(() => {
      const ids = this.supplierIds()
      const current = untracked(() => this.prices())
      const next = fillSupplierPrices(
        ids,
        current,
        untracked(() => this.seed())
      )
      const same = Object.keys(next).length === Object.keys(current).length && ids.every((id) => id in current)
      if (!same) this.pricesChange.emit(next)
    })
  }

  protected setPrice_(id: string, event: Event): void {
    if (this.lockWhy_()) return
    const raw = (event.target as HTMLInputElement).value
    const value = raw === '' ? null : Number(raw)
    this.pricesChange.emit({
      ...this.prices(),
      [id]: value != null && Number.isFinite(value) && value >= 0 ? value : null
    })
  }
}
