import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { chooseSupplier } from 'src/app/core/engine/supplier-choice'
import { KitchenStateService } from '@services/kitchen-state.service'
import type { Product } from '@models/product.model'

export interface SupplierPickerRow {
  supplierId: string
  name: string
  price: number
  cheapest: boolean
  checked: boolean
}

/**
 * Plan 510: pick which supplier a product comes from, right in the recipe line. Shown only when the product
 * has 2+ priced suppliers. Emits the supplier id, or '' for «הזול ביותר (אוטומטי)». The parent saves the product.
 */
@Component({
  selector: 'app-supplier-picker',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, ClickOutSideDirective],
  templateUrl: './supplier-picker.component.html',
  styleUrl: './supplier-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierPickerComponent {
  private readonly kitchenState_ = inject(KitchenStateService)

  readonly product = input.required<Product>()
  /** Owner only (`editMoney`); staff see the list but cannot change it. */
  readonly canEdit = input(false)
  readonly picked = output<string>()

  protected readonly open_ = signal(false)

  /** One row per priced supplier, cheapest first. */
  protected readonly rows_ = computed<SupplierPickerRow[]>(() => {
    const product = this.product()
    const suppliers = this.kitchenState_.suppliersById_()
    const current = chooseSupplier(product).supplierId
    const cheapest = chooseSupplier({ sources: product.sources }).supplierId
    const seen = new Set<string>()
    const rows: SupplierPickerRow[] = []
    for (const s of product.sources ?? []) {
      if (!s.supplierId || !(s.price > 0) || seen.has(s.supplierId)) continue
      seen.add(s.supplierId)
      rows.push({
        supplierId: s.supplierId,
        name: suppliers.get(s.supplierId)?.nameHebrew ?? s.supplierId,
        price: s.price,
        cheapest: s.supplierId === cheapest,
        checked: s.supplierId === current
      })
    }
    return rows.sort((a, b) => a.price - b.price)
  })

  protected readonly visible_ = computed(() => this.rows_().length >= 2)
  /** True when the product follows the cheapest supplier (no valid choice stored). */
  protected readonly auto_ = computed(() => {
    const id = this.product().preferredSupplierId
    return !id || !this.rows_().some((r) => r.supplierId === id)
  })
  protected readonly currentName_ = computed(() => this.rows_().find((r) => r.checked)?.name ?? '')

  protected toggle(): void {
    this.open_.update((v) => !v)
  }

  protected close(): void {
    this.open_.set(false)
  }

  protected pick(id: string): void {
    if (!this.canEdit()) return
    this.open_.set(false)
    this.picked.emit(id)
  }
}
