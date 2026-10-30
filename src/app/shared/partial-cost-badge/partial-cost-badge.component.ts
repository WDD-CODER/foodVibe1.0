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
import type { MissingItem } from 'src/app/core/engine/event-plan.types'
import type { Product } from '@models/product.model'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { QuickAddProductModalService } from '@services/quick-add-product-modal.service'
import { UnlinkedIngredientLinkService } from '@services/unlinked-ingredient-link.service'
import { ProductDataService } from '@services/product-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { CustomSelectComponent } from 'src/app/shared/custom-select/custom-select.component'
import { isValidQuickPrice, withQuickPrice } from 'src/app/core/utils/quick-price.util'
import { placeInViewport } from 'src/app/core/utils/viewport-placement.util'
import { SelectOnFocusDirective } from '@directives/select-on-focus.directive'
import { NumberBoxDirective } from '@directives/number-box.directive'

/** Below this width the popover is a full-width bottom sheet (mirrors `$break-mobile` in the scss). */
const MOBILE_QUERY = '(max-width: 768px)'

/** The «add new» option of the link field; `addNewChosen` carries the typed name, the value itself is ignored. */
const ADD_PRODUCT_VALUE = '__add_product__'

interface MissingRow {
  key: string
  item: MissingItem
  recipeNames: string
  product: Product | null
  canPrice: boolean
  /** An ingredient typed as free text, with no product behind it. */
  isUnlinked: boolean
  /** The user may edit every stored recipe that holds the row, so linking it is allowed. */
  canLink: boolean
  unitLabel: string
  /** Lucide icon per kind: deleted / unlinked / unpriced. */
  icon: string
  /** The item's name, or a readable fallback when only its id is known. */
  displayName: string
}

const ROW_ICONS: Record<MissingItem['kind'], string> = { deleted: 'circle-x', unlinked: 'link', unpriced: 'tag' }

/**
 * Plan 444 — the one "חלקי" badge. Shows nothing when `missing` is empty; otherwise an amber chip that opens
 * a popover listing what makes the total partial. The owner types a missing price right there; staff see a note.
 */
@Component({
  selector: 'app-partial-cost-badge',
  standalone: true,
  imports: [
    NumberBoxDirective,
    LucideAngularModule,
    TranslatePipe,
    ClickOutSideDirective,
    CustomSelectComponent,
    SelectOnFocusDirective
  ],
  templateUrl: './partial-cost-badge.component.html',
  styleUrl: './partial-cost-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartialCostBadgeComponent {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly permission_ = inject(PermissionService)
  private readonly productData_ = inject(ProductDataService)
  private readonly translation_ = inject(TranslationService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly logging_ = inject(LoggingService)
  private readonly linkService_ = inject(UnlinkedIngredientLinkService)
  private readonly quickAddModal_ = inject(QuickAddProductModalService)

  readonly missing = input<MissingItem[]>([])
  /** 'above' for a badge in a bar fixed to the bottom of the screen. */
  readonly placement = input<'below' | 'above'>('below')
  /** Names for recipe ids the kitchen state does not know yet (a recipe being built and not saved). */
  readonly recipeNames = input<Record<string, string>>({})
  /** The recipe a host is editing in a form (not stored yet): linking leaves its stored copy alone and emits `linked`. */
  readonly formRecipeId = input<string | null>(null)
  /** Plan 466 — an unlinked ingredient was linked to a product; a host that reads a form patches its rows. */
  readonly linked = output<{ name: string; product: Product }>()

  private readonly chipRef_ = viewChild<ElementRef<HTMLElement>>('chip')
  private readonly popoverRef_ = viewChild<ElementRef<HTMLElement>>('popover')

  protected readonly isOpen_ = signal(false)
  /** True when the popover ended up under the chip (it flips from the preferred side when that side is too tight). */
  protected readonly isBelow_ = signal(true)
  protected readonly drafts_ = signal<Record<string, string>>({})
  protected readonly savingKey_ = signal<string | null>(null)
  /** True once the popover was opened by a click or a focus, so the mouse leaving does not close it. */
  private isPinned_ = false
  /** True while the create-product window is open: a click inside it is not a click outside the popover. */
  private readonly modalOpen_ = signal(false)

  /** Every product by Hebrew name, then the «add new» option — the link field's list. */
  protected readonly linkOptions_ = computed(() => {
    const products = [...this.kitchenState_.productsById_().values()].sort((a, b) =>
      a.nameHebrew.localeCompare(b.nameHebrew, 'he')
    )
    return [...products.map((p) => ({ value: p._id, label: p.nameHebrew })), { value: ADD_PRODUCT_VALUE, label: '' }]
  })

  protected readonly rows_ = computed<MissingRow[]>(() => {
    const productsById = this.kitchenState_.productsById_()
    const recipesById = this.kitchenState_.recipesById_()
    const extraNames = this.recipeNames()
    return this.missing().map((item) => {
      const recipeIds = item.recipeIds ?? []
      const recipeNames = recipeIds
        .map((id) => recipesById.get(id)?.nameHebrew ?? extraNames[id] ?? '')
        .filter((n) => !!n)
        .join(', ')
      const rawId = !item.name || item.name === item.productId || recipeIds.includes(item.name)
      const product = item.kind === 'unpriced' && item.productId ? (productsById.get(item.productId) ?? null) : null
      return {
        key: `${item.kind}|${item.productId ?? item.name}`,
        item,
        recipeNames,
        product,
        canPrice: !!product && this.permission_.can('editMoney', { type: 'products', doc: product }),
        isUnlinked: item.kind === 'unlinked',
        canLink: item.kind === 'unlinked' && this.linkService_.canLink(recipeIds, this.formRecipeId()),
        unitLabel: product ? this.translation_.translate(product.baseUnit) : '',
        icon: ROW_ICONS[item.kind],
        displayName: rawId ? this.translation_.translate('partial_unnamed_item') : item.name
      }
    })
  })

  constructor() {
    // The popover lives in the browser top layer, so an ancestor's overflow, transform or backdrop-filter can
    // neither clip it nor shift it. It is placed in viewport coordinates against the chip.
    effect((onCleanup) => {
      const el = this.popoverRef_()?.nativeElement
      if (!el) return
      if (!el.matches(':popover-open')) el.showPopover()
      this.place_(el)

      const reposition = (event?: Event): void => {
        // Scrolling the popover's own list is not a page scroll.
        if (event?.target instanceof Node && el.contains(event.target)) return
        this.place_(el)
      }
      // The list shrinks when a saved price drops out of it; the popover is re-placed against the chip then.
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.place_(el))
      observer?.observe(el)
      window.addEventListener('scroll', reposition, true)
      window.addEventListener('resize', reposition)
      onCleanup(() => {
        observer?.disconnect()
        window.removeEventListener('scroll', reposition, true)
        window.removeEventListener('resize', reposition)
      })
    })
  }

  protected toggle(): void {
    if (this.isOpen_() && !this.isPinned_) {
      this.isPinned_ = true
      return
    }
    this.isPinned_ = true
    this.isOpen_.update((v) => !v)
  }

  protected onEnter(): void {
    if (this.isOpen_() || !this.hoverCapable()) return
    this.isPinned_ = false
    this.isOpen_.set(true)
  }

  protected onLeave(): void {
    if (!this.isPinned_) this.isOpen_.set(false)
  }

  protected close(): void {
    this.isOpen_.set(false)
    this.isPinned_ = false
  }

  /**
   * Focus moving into the popover (its price box or buttons) pins it, so the mouse leaving does not close it.
   * Focus landing on the chip itself does not: a mouse press focuses the chip just before its click, and pinning
   * there would make that click close a popover the hover had just opened.
   */
  protected pin(event: FocusEvent): void {
    const chip = this.chipRef_()?.nativeElement
    if (chip && event.target instanceof Node && chip.contains(event.target)) return
    this.isPinned_ = true
  }

  protected perUnitLabel(row: MissingRow): string {
    return this.translation_.translate('quick_price_per_unit').replace('{{unit}}', row.unitLabel)
  }

  protected onDraft(row: MissingRow, event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.drafts_.update((d) => ({ ...d, [row.key]: value }))
  }

  protected draftPrice(row: MissingRow): number | null {
    const raw = (this.drafts_()[row.key] ?? '').trim()
    return raw === '' ? null : Number(raw)
  }

  protected canSave(row: MissingRow): boolean {
    return isValidQuickPrice(this.draftPrice(row)) && this.savingKey_() === null
  }

  protected async save(row: MissingRow): Promise<void> {
    const price = this.draftPrice(row)
    if (!row.product || !isValidQuickPrice(price) || this.savingKey_() !== null) return
    this.savingKey_.set(row.key)
    try {
      await this.productData_.updateProduct(withQuickPrice(row.product, price))
      this.drafts_.update((d) => {
        const { [row.key]: _saved, ...rest } = d
        return rest
      })
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('quick_price_saved'))
    } catch (err) {
      this.logging_.error({
        event: 'crud.product.quick_price_error',
        message: 'Failed to save quick price',
        context: { err }
      })
      this.userMsg_.onSetErrorMsg(this.translation_.translate('server_error'))
    } finally {
      this.savingKey_.set(null)
    }
  }

  /** Ignores a click while the create-product window is open (it lives outside the popover). */
  protected onClickOutside(): void {
    if (this.modalOpen_()) return
    this.close()
  }

  /** The link list opens in the popover's own flow; scroll the popover body so the whole list is in view. */
  protected revealLinkList(event: Event): void {
    const host = event.currentTarget as HTMLElement | null
    if (!host) return
    requestAnimationFrame(() => host.querySelector('.c-dropdown')?.scrollIntoView?.({ block: 'nearest' }))
  }

  /** An existing product was picked in the link field. The «add new» sentinel is handled by `addNew`. */
  protected onLinkPicked(row: MissingRow, productId: string): void {
    if (productId === ADD_PRODUCT_VALUE) return
    const product = this.kitchenState_.productsById_().get(productId)
    if (product) void this.linkTo(row, product)
  }

  /** «Add "<typed>"»: the create window opens with the typed text (or the row's name); the saved product is linked. */
  protected async addNew(row: MissingRow, typed: string): Promise<void> {
    this.modalOpen_.set(true)
    // The popover sits in the browser top layer and would cover the create window: take it out while that is open.
    const popover = this.popoverRef_()?.nativeElement
    if (popover?.matches(':popover-open')) popover.hidePopover()
    let product: Product | null = null
    try {
      product = await this.quickAddModal_.open({ prefillName: typed.trim() || row.item.name })
    } finally {
      if (popover?.isConnected) {
        if (!popover.matches(':popover-open')) popover.showPopover()
        this.place_(popover)
      }
      // Released after the click that closed the window has finished bubbling, so it is not a click outside.
      setTimeout(() => this.modalOpen_.set(false))
    }
    if (product) await this.linkTo(row, product)
  }

  /**
   * Links `product` to the row's ingredient everywhere it is stored. The badge may be gone once its list empties,
   * so `linked` goes out first and the stored write only uses the service and injected helpers.
   */
  private async linkTo(row: MissingRow, product: Product): Promise<void> {
    const { name, recipeIds } = row.item
    this.linked.emit({ name, product })
    try {
      await this.linkService_.link({ name, product, recipeIds, skipRecipeId: this.formRecipeId() })
      this.userMsg_.onSetSuccessMsg(this.translation_.translate('partial_linked'))
    } catch {
      // saveRecipe already logged the failure and showed the server's error toast.
    }
  }

  private hoverCapable(): boolean {
    try {
      return typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches
    } catch {
      return false
    }
  }

  private place_(popover: HTMLElement): void {
    const chip = this.chipRef_()?.nativeElement
    if (!chip) return
    if (this.isMobile_()) {
      // Full-width bottom sheet: the scss pins it to the viewport, so no inline position.
      popover.style.top = ''
      popover.style.left = ''
      popover.style.maxBlockSize = ''
      this.isBelow_.set(false)
      return
    }
    popover.style.maxBlockSize = ''
    const { width, height } = popover.getBoundingClientRect()
    const placed = placeInViewport({
      anchor: chip.getBoundingClientRect(),
      panel: { width, height },
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      prefer: this.placement()
    })
    this.isBelow_.set(placed.below)
    popover.style.maxBlockSize = placed.maxHeight === null ? '' : `${placed.maxHeight}px`
    popover.style.top = `${placed.top}px`
    popover.style.left = `${placed.left}px`
  }

  private isMobile_(): boolean {
    try {
      return typeof matchMedia === 'function' && matchMedia(MOBILE_QUERY).matches
    } catch {
      return false
    }
  }
}
