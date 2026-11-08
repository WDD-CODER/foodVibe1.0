import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { cheapestSupplier, chooseSupplier } from 'src/app/core/engine/supplier-choice'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import type { Product } from '@models/product.model'

export interface SupplierPickerRow {
  supplierId: string
  name: string
  price: number
  cheapest: boolean
  checked: boolean
}

/**
 * Plan 510: a truck icon on a recipe line whose product has 2+ priced suppliers. The popover lists them
 * (name, price per base unit); picking one emits its id, «הזול ביותר (אוטומטי)» emits null. The parent saves.
 * Staff see the current supplier but cannot change it (`canEdit` false).
 */
@Component({
  selector: 'app-supplier-picker',
  standalone: true,
  imports: [LucideAngularModule, ClickOutSideDirective, TranslatePipe],
  templateUrl: './supplier-picker.component.html',
  styleUrl: './supplier-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierPickerComponent {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly translation_ = inject(TranslationService)

  readonly product = input<Product | null>(null)
  readonly canEdit = input(false)
  /** The picked supplier id, or null for «cheapest (automatic)». */
  readonly picked = output<string | null>()

  protected readonly open_ = signal(false)

  /** True when the stored choice is absent, or names a supplier without a price (then the cheapest is used). */
  private readonly hasValidChoice_ = computed(() => {
    const p = this.product()
    return (
      !!p?.preferredSupplierId && (p.sources ?? []).some((s) => s.supplierId === p.preferredSupplierId && s.price > 0)
    )
  })

  protected readonly auto_ = computed(() => !this.hasValidChoice_())

  protected readonly rows_ = computed<SupplierPickerRow[]>(() => {
    const p = this.product()
    if (!p) return []
    const cheapest = cheapestSupplier(p)?.supplierId
    const current = chooseSupplier(p).supplierId
    const byId = this.kitchenState_.suppliersById_()
    const seen = new Set<string>()
    const rows: SupplierPickerRow[] = []
    for (const s of p.sources ?? []) {
      if (!s.supplierId || !(s.price > 0) || seen.has(s.supplierId)) continue
      seen.add(s.supplierId)
      rows.push({
        supplierId: s.supplierId,
        name: byId.get(s.supplierId)?.nameHebrew ?? s.supplierId,
        price: s.price,
        cheapest: s.supplierId === cheapest,
        checked: this.hasValidChoice_() && s.supplierId === current
      })
    }
    return rows.sort((a, b) => a.price - b.price)
  })

  protected readonly visible_ = computed(() => this.rows_().length >= 2)

  /** The supplier the cost uses now (tooltip). */
  protected readonly title_ = computed(() => {
    const p = this.product()
    const id = p ? chooseSupplier(p).supplierId : null
    const name = id ? (this.kitchenState_.suppliersById_().get(id)?.nameHebrew ?? '') : ''
    return `${this.translation_.translate('pick_supplier')}: ${name}`
  })

  protected toggle(): void {
    this.open_.update((v) => !v)
  }

  protected close(): void {
    this.open_.set(false)
  }

  protected pick(id: string | null): void {
    if (this.canEdit()) this.picked.emit(id)
    this.close()
  }
}
