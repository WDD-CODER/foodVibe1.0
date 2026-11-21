import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { BusinessService } from '@services/business.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { PriceRise, ProductImportService } from '@services/product-import.service'
import { TranslationService } from '@services/translation.service'
import { formatMoney, formatPct1 } from 'src/app/core/engine/rounding'

/** The rows listed before the closing "and N more" line. */
const MAX_ROWS = 5
const dateText = (ms: number): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(new Date(ms))

/** Plan 629: the prices that rose in the last 60 days. Owner or consultant (editMoney); hidden with nothing to show. */
@Component({
  selector: 'app-price-rises-card',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, TranslatePipe],
  templateUrl: './price-rises-card.component.html',
  styleUrl: './price-rises-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PriceRisesCardComponent {
  private readonly importService = inject(ProductImportService)
  private readonly businessService = inject(BusinessService)
  private readonly kitchenState = inject(KitchenStateService)
  private readonly permission = inject(PermissionService)
  private readonly logging = inject(LoggingService)
  private readonly translation = inject(TranslationService)

  private readonly rises_ = signal<PriceRise[]>([])
  private readonly isRequested_ = signal(false)
  protected readonly formatMoney = formatMoney

  /** Rises of products that still exist (a row of a deleted product is skipped), newest first. */
  private readonly known_ = computed(() => {
    const products = this.kitchenState.productsById_()
    return this.rises_()
      .filter((rise) => products.has(rise.productId))
      .sort((a, b) => b.at - a.at)
  })

  protected readonly visible = computed(() => this.known_().length > 0)

  protected readonly rows = computed(() => {
    const products = this.kitchenState.productsById_()
    const suppliers = new Map(this.kitchenState.suppliers_().map((s) => [s._id, s.nameHebrew]))
    const none = this.translation.translate('import_no_supplier')
    return this.known_()
      .slice(0, MAX_ROWS)
      .map((rise) => ({
        key: `${rise.productId}|${rise.supplierId}`,
        name: products.get(rise.productId)?.nameHebrew ?? '',
        supplier: (rise.supplierId && suppliers.get(rise.supplierId)) || none,
        from: rise.from,
        to: rise.to,
        pct: '+' + formatPct1(rise.changePct),
        date: dateText(rise.at)
      }))
  })

  protected readonly moreText = computed(() => {
    const rest = this.known_().length - MAX_ROWS
    return rest > 0 ? this.translation.translate('price_impact_more').replace('{count}', String(rest)) : ''
  })

  constructor() {
    effect(() => {
      const business = this.businessService.business_()
      if (!this.permission.can('editMoney', { type: 'products' }) || !business) return
      untracked(() => {
        if (this.isRequested_()) return
        this.isRequested_.set(true)
        void this.load()
      })
    })
  }

  private async load(): Promise<void> {
    try {
      this.rises_.set(await this.importService.getPriceRises(60))
    } catch (err) {
      this.logging.warn('Price rises could not be loaded', { status: (err as { status?: number }).status })
    }
  }
}
