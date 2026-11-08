import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import type { Product } from '@models/product.model'
import { chooseSupplier } from 'src/app/core/engine/supplier-choice'
import { formatMoney } from 'src/app/core/engine/rounding'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { KitchenStateService } from '@services/kitchen-state.service'
import { ProductDataService } from '@services/product-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { LoggingService } from '@services/logging.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'

export interface SupplierOption {
  supplierId: string
  name: string
  /** Price per base unit. */
  price: number
  cheapest: boolean
}

/**
 * Plan 510 — the truck on a recipe line: which supplier the product is bought from. Shown only when 2+ known
 * suppliers price the product. The owner picks one (saved on the product, so every recipe uses it) or
 * «הזול ביותר (אוטומטי)», which clears the choice. Staff see the list but cannot change it.
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
  private readonly productData_ = inject(ProductDataService)
  private readonly translation_ = inject(TranslationService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly logging_ = inject(LoggingService)

  readonly product = input.required<Product>()
  /** Owner (editMoney): may change the choice. */
  readonly canEdit = input(false)
  /** The picked supplier id, or null for «automatic» (the cheapest); emitted after the product is saved. */
  readonly picked = output<string | null>()

  protected readonly isOpen_ = signal(false)
  protected readonly saving_ = signal(false)
  private readonly triggerRef_ = viewChild<ElementRef<HTMLElement>>('trigger')
  private readonly popoverRef_ = viewChild<ElementRef<HTMLElement>>('popover')

  /** One row per known supplier with a positive price, in the product's source order. */
  protected readonly options_ = computed<SupplierOption[]>(() => {
    const suppliers = this.kitchenState_.suppliersById_()
    const sources = (this.product().sources ?? []).filter(
      (s) => !!s.supplierId && s.price > 0 && suppliers.has(s.supplierId)
    )
    const cheapestId = chooseSupplier({ sources }).supplierId
    return sources.map((s) => ({
      supplierId: s.supplierId,
      name: suppliers.get(s.supplierId)?.nameHebrew ?? '',
      price: s.price,
      cheapest: s.supplierId === cheapestId
    }))
  })

  /** The truck shows only when there is a real choice. */
  protected readonly visible_ = computed(() => this.options_().length > 1)

  /** The supplier whose price the costs use now. */
  protected readonly currentId_ = computed(() => chooseSupplier(this.product()).supplierId)
  protected readonly currentName_ = computed(
    () => this.options_().find((o) => o.supplierId === this.currentId_())?.name ?? ''
  )
  /** True when no valid choice is stored, so the cheapest is used. */
  protected readonly isAuto_ = computed(() => {
    const preferred = this.product().preferredSupplierId
    return !preferred || !this.options_().some((o) => o.supplierId === preferred)
  })

  constructor() {
    // Top layer, so the table row's overflow never clips the list; placed against the truck.
    effect((onCleanup) => {
      const el = this.popoverRef_()?.nativeElement
      if (!el) return
      if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) el.showPopover()
      this.place_(el)
      const reposition = (): void => this.place_(el)
      window.addEventListener('scroll', reposition, true)
      window.addEventListener('resize', reposition)
      onCleanup(() => {
        window.removeEventListener('scroll', reposition, true)
        window.removeEventListener('resize', reposition)
      })
    })
  }

  protected toggle(): void {
    this.isOpen_.update((v) => !v)
  }

  protected close(): void {
    this.isOpen_.set(false)
  }

  /** «₪4 / ק"ג» */
  protected priceText(option: SupplierOption): string {
    const unit = this.product().baseUnit
    const money = formatMoney(option.price).replace(/\.00$/, '')
    return unit ? `${money} / ${this.translation_.translate(unit)}` : money
  }

  /** Saves the choice on the product (null = automatic) and closes the list. */
  protected async pick(supplierId: string | null): Promise<void> {
    if (!this.canEdit() || this.saving_()) return
    const product = this.product()
    const next = supplierId ?? ''
    if ((product.preferredSupplierId ?? '') === next) {
      this.close()
      return
    }
    this.saving_.set(true)
    try {
      // A server PUT merges into the stored doc, so «automatic» is saved as '' (a missing key would keep the old choice).
      await this.productData_.updateProduct({ ...product, preferredSupplierId: next })
      this.close()
      this.picked.emit(supplierId)
    } catch (err) {
      this.logging_.error({
        event: 'crud.product.preferred_supplier_error',
        message: 'Saving the chosen supplier failed',
        context: { err }
      })
      this.userMsg_.onSetErrorMsg(this.translation_.translate('product_update_error'))
    } finally {
      this.saving_.set(false)
    }
  }

  private place_(popover: HTMLElement): void {
    const trigger = this.triggerRef_()?.nativeElement
    if (!trigger) return
    const { width, height } = popover.getBoundingClientRect()
    const placed = placeInViewport({
      anchor: trigger.getBoundingClientRect(),
      panel: { width, height },
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      prefer: 'below'
    })
    popover.style.maxBlockSize = placed.maxHeight === null ? '' : `${placed.maxHeight}px`
    popover.style.top = `${placed.top}px`
    popover.style.left = `${placed.left}px`
  }
}
