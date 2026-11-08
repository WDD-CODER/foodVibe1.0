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
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component'
import { PartialCostBadgeComponent } from 'src/app/shared/partial-cost-badge/partial-cost-badge.component'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import type { RawLine } from 'src/app/core/engine/event-plan.types'
import { EventPlanService } from 'src/app/core/engine/event-plan.service'
import { formatMoney } from 'src/app/core/engine/rounding'
import {
  buildAllOrdersMessage,
  buildOrderMessage,
  buildSupplierOrders,
  cheaperElsewhere,
  describeOrderLine,
  toWhatsAppPhone,
  type OrderHeader,
  type CardSavings,
  type CheaperElsewhere,
  type OrderLineView,
  type SupplierOrderCard
} from 'src/app/core/utils/supplier-orders.util'
import type { MenuEvent } from '@models/menu-event.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { BusinessService } from '@services/business.service'
import { UserService } from '@services/user.service'

/**
 * "הזמנות לספקים" (plan 435) — one order card per supplier for a menu, ready to copy or to send to the
 * supplier's WhatsApp. Quantities come from the engine plan; nothing is saved. Opened from the menu page.
 */
@Component({
  selector: 'app-supplier-orders',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent, PartialCostBadgeComponent],
  templateUrl: './supplier-orders.component.html',
  styleUrl: './supplier-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close.emit()' }
})
export class SupplierOrdersComponent {
  // 1. INJECTED
  private readonly eventPlan_ = inject(EventPlanService)
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly translation_ = inject(TranslationService)
  private readonly userMsg_ = inject(UserMsgService)
  private readonly businessService_ = inject(BusinessService)
  private readonly userService_ = inject(UserService)

  // 2. INPUTS
  readonly event = input.required<MenuEvent>()

  // 3. OUTPUTS
  readonly close = output<void>()

  // 4. SIGNALS & CONSTANTS
  /** The message the browser refused to copy; shown selected in a textarea for a manual copy. */
  protected readonly manualCopy_ = signal<string | null>(null)
  private readonly manualEl_ = viewChild<ElementRef<HTMLTextAreaElement>>('manual')
  protected readonly t_ = (key: string): string => this.translation_.translate(key)

  // 5. COMPUTED
  private readonly plan_ = computed(() => this.eventPlan_.planFor(this.event()))
  protected readonly orders_ = computed(() =>
    buildSupplierOrders(this.plan_(), this.kitchenState_.productsById_(), this.kitchenState_.suppliersById_(), this.t_)
  )
  /** Per card: the plan's unpriced products that are lines of that card (plan 444). */
  protected readonly cardMissing_ = computed(() => {
    const unpriced = this.plan_().missing.filter((m) => m.kind === 'unpriced')
    return this.orders_().cards.map((card) => {
      const ids = new Set(card.lines.map((l) => l.productId))
      return unpriced.filter((m) => !!m.productId && ids.has(m.productId))
    })
  })
  /** Plan 510 (information only): per card, the lines another supplier sells for less and the possible saving. */
  protected readonly cardSavings_ = computed<CardSavings[]>(() => {
    const products = this.kitchenState_.productsById_()
    const suppliers = this.kitchenState_.suppliersById_()
    return this.orders_().cards.map((card) => cheaperElsewhere(card, products, suppliers))
  })
  protected readonly empty_ = computed(() => this.plan_().rawLines.length === 0)
  private readonly header_ = computed<OrderHeader>(() => {
    const event = this.event()
    return {
      business: this.businessService_.business_()?.name ?? this.userService_.user_()?.name ?? '',
      eventName: event.name,
      eventDate: event.eventDate
    }
  })

  constructor() {
    effect(() => {
      const el = this.manualEl_()?.nativeElement
      if (!el) return
      el.focus()
      el.select()
    })
  }

  // 6. METHODS
  protected view(line: RawLine): OrderLineView {
    return describeOrderLine(line, this.t_)
  }

  protected money(n: number): string {
    return formatMoney(n)
  }

  /** «זול יותר אצל דוד: ₪4 (חיסכון ₪3)». */
  protected cheaperText(hint: CheaperElsewhere): string {
    return this.t_('supplier_orders_cheaper_at')
      .replace('{supplier}', hint.name)
      .replace('{price}', this.shortMoney(hint.price))
      .replace('{saving}', this.shortMoney(hint.saving))
  }

  protected savingText(total: number): string {
    return this.t_('supplier_orders_can_save').replace('{saving}', this.shortMoney(total))
  }

  /** ₪ with two decimals, a whole number without ".00". */
  private shortMoney(n: number): string {
    return formatMoney(n).replace(/.00$/, '')
  }

  protected statusKey(line: RawLine): string {
    return `line_status_${line.status}`
  }

  protected async copyCard(card: SupplierOrderCard): Promise<void> {
    await this.copy(buildOrderMessage(this.header_(), card, this.t_))
  }

  protected async copyAll(): Promise<void> {
    await this.copy(buildAllOrdersMessage(this.header_(), this.orders_().cards, this.t_))
  }

  /** WhatsApp number → wa.me chat; no number → share sheet; no share → copy; bad number → copy and say so. */
  protected async send(card: SupplierOrderCard): Promise<void> {
    const message = buildOrderMessage(this.header_(), card, this.t_)
    const phone = toWhatsAppPhone(card.phone)
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    } else if (card.phone) {
      await this.copy(message, 'supplier_orders_invalid_phone', true)
    } else if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message })
      } catch (err) {
        // The chef closing the share sheet is not an error.
        if ((err as DOMException | undefined)?.name !== 'AbortError') await this.copy(message)
      }
    } else {
      await this.copy(message)
    }
  }

  protected onOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.close.emit()
  }

  private async copy(text: string, msgKey = 'supplier_orders_copied', warn = false): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      this.manualCopy_.set(text)
      return
    }
    this.manualCopy_.set(null)
    const msg = this.t_(msgKey)
    if (warn) this.userMsg_.onSetWarningMsg(msg)
    else this.userMsg_.onSetSuccessMsg(msg)
  }
}
