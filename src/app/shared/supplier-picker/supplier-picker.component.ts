import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core'
import { LucideAngularModule } from 'lucide-angular'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { cheapestSupplier, chooseSupplier } from 'src/app/core/engine/supplier-choice'
import { formatMoney } from 'src/app/core/engine/rounding'
import { placeInViewport, type PlacementAnchor, type PlacementResult } from 'src/app/core/utils/viewport-placement.util'
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
 * Plan 536: a truck button on a line whose product has 2+ priced suppliers. The popover lists them (name, price per
 * base unit); picking one emits its id, «הזול ביותר (אוטומטי)» emits null. The parent stores the choice.
 * Staff see the current supplier but cannot change it (`canEdit` false). The list is `position: fixed` and placed
 * inside the viewport, so a scrolling table never hides it.
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
  private readonly injector_ = inject(Injector)

  readonly product = input<Product | null>(null)
  /** The line's chosen supplier id; null = automatic (cheapest). */
  readonly value = input<string | null>(null)
  readonly canEdit = input(false)
  /** The picked supplier id, or null for «cheapest (automatic)». */
  readonly picked = output<string | null>()

  protected readonly open_ = signal(false)
  private readonly btnRef_ = viewChild<ElementRef<HTMLButtonElement>>('btn')
  private readonly listRef_ = viewChild<ElementRef<HTMLElement>>('list')

  /** True when `value` names a supplier that still has a positive price on the product. */
  private readonly hasValidChoice_ = computed(() => {
    const p = this.product()
    const v = this.value()
    return !!v && (p?.sources ?? []).some((s) => s.supplierId === v && s.price > 0)
  })

  protected readonly auto_ = computed(() => !this.hasValidChoice_())

  protected readonly rows_ = computed<SupplierPickerRow[]>(() => {
    const p = this.product()
    if (!p) return []
    const cheapest = cheapestSupplier(p)?.supplierId
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
        checked: this.hasValidChoice_() && s.supplierId === this.value()
      })
    }
    return rows.sort((a, b) => a.price - b.price)
  })

  protected readonly visible_ = computed(() => this.rows_().length >= 2)

  /** The supplier the cost uses now (tooltip). */
  protected readonly title_ = computed(() => {
    const p = this.product()
    const id = p ? chooseSupplier(p, this.value()).supplierId : null
    const name = id ? (this.kitchenState_.suppliersById_().get(id)?.nameHebrew ?? '') : ''
    return `${this.translation_.translate('pick_supplier')}: ${name}`
  })

  constructor() {
    // While open: a resize or a page scroll (outside the list itself) closes the list.
    effect((onCleanup) => {
      if (!this.open_()) return
      const onResize = (): void => this.close()
      const onScroll = (ev: Event): void => {
        const list = this.listRef_()?.nativeElement
        if (list && ev.target instanceof Node && list.contains(ev.target)) return
        this.close()
      }
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onScroll, true)
      onCleanup(() => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('scroll', onScroll, true)
      })
    })
  }

  /** Where the list goes so it stays fully inside the viewport (below the button when it fits). */
  placement(
    anchor: PlacementAnchor,
    panel: { width: number; height: number },
    viewport: { width: number; height: number }
  ): PlacementResult {
    return placeInViewport({ anchor, panel, viewport, prefer: 'below' })
  }

  protected toggle(): void {
    if (this.open_()) {
      this.close()
      return
    }
    this.open_.set(true)
    afterNextRender(
      () => {
        this.place_()
        this.focusRow_(0, true)
      },
      { injector: this.injector_ }
    )
  }

  protected close(): void {
    this.open_.set(false)
  }

  protected pick(id: string | null): void {
    if (this.canEdit()) this.picked.emit(id)
    this.close()
    this.btnRef_()?.nativeElement.focus()
  }

  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      if (!this.open_()) return
      ev.stopPropagation()
      ev.preventDefault()
      this.close()
      this.btnRef_()?.nativeElement.focus()
    } else if (this.open_() && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      ev.preventDefault()
      this.focusRow_(ev.key === 'ArrowDown' ? 1 : -1, false)
    } else if (ev.key === 'Tab') {
      this.close()
    }
  }

  private rowEls_(): HTMLButtonElement[] {
    const list = this.listRef_()?.nativeElement
    return Array.from(list?.querySelectorAll<HTMLButtonElement>('.supplier-picker__row') ?? [])
  }

  /** `absolute` true: focus the checked row (or the first); else move by `step` from the focused row. */
  private focusRow_(step: number, absolute: boolean): void {
    const rows = this.rowEls_()
    if (!rows.length) return
    if (absolute) {
      const checked = rows.findIndex((r) => r.getAttribute('aria-selected') === 'true')
      rows[Math.max(0, checked)].focus()
      return
    }
    const at = rows.indexOf(document.activeElement as HTMLButtonElement)
    rows[(at + step + rows.length) % rows.length].focus()
  }

  /** Measure the rendered list, then fix it inside the viewport. */
  private place_(): void {
    const list = this.listRef_()?.nativeElement
    const btn = this.btnRef_()?.nativeElement
    if (!list || !btn) return
    list.style.maxBlockSize = ''
    const { width, height } = list.getBoundingClientRect()
    const placed = this.placement(
      btn.getBoundingClientRect(),
      { width, height },
      { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
    )
    list.style.maxBlockSize = placed.maxHeight === null ? '' : `${placed.maxHeight}px`
    list.style.top = `${placed.top}px`
    list.style.left = `${placed.left}px`
  }

  protected money(n: number): string {
    return formatMoney(n)
  }
}
