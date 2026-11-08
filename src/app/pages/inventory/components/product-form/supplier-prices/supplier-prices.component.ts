import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core'
import { NumberBoxDirective } from '@directives/number-box.directive'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { PermissionService } from '@services/permission.service'
import { FormFieldComponent } from 'src/app/shared/form-field/form-field.component'
import { fillSupplierPrices, type SupplierPrices } from './supplier-prices.util'

/**
 * Plan 473: one price box per selected supplier, in chip order. A child component because
 * `product-form.component.ts` is growth-frozen. The first row starts from `seed`, later rows copy it.
 */
@Component({
  selector: 'app-supplier-prices',
  standalone: true,
  imports: [NumberBoxDirective, SelectOnFocusDirective, TranslatePipe, FormFieldComponent],
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
  /** Plan 510: the supplier the owner picked in the recipe builder; its row shows «נבחר» while it has a price. */
  readonly preferredSupplierId = input<string | undefined>(undefined)
  /** The whole form is read-only. */
  readonly disabled = input(false)
  readonly pricesChange = output<SupplierPrices>()

  /** Staff: prices are the owner's job. */
  protected readonly locked_ = computed(
    () => this.disabled() || (this.permission.isStaff_() && !this.permission.can('editMoney', { type: 'products' }))
  )

  /** The row marked «נבחר»: the chosen supplier when it is still a row with a positive price, else none. */
  protected readonly chosenId_ = computed(() => {
    const id = this.preferredSupplierId()
    if (!id || !this.supplierIds().includes(id)) return null
    const price = this.prices()[id]
    return price != null && price > 0 ? id : null
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
    const raw = (event.target as HTMLInputElement).value
    const value = raw === '' ? null : Number(raw)
    this.pricesChange.emit({
      ...this.prices(),
      [id]: value != null && Number.isFinite(value) && value >= 0 ? value : null
    })
  }
}
