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
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import type { RawLine } from 'src/app/core/engine/event-plan.types'
import { EventPlanService } from 'src/app/core/engine/event-plan.service'
import { formatMoney } from 'src/app/core/engine/rounding'
import {
  buildAllOrdersMessage,
  buildOrderMessage,
  buildSupplierOrders,
  describeOrderLine,
  toWhatsAppPhone,
  type OrderHeader,
  type OrderLineView,
  type SupplierOrderCard
} from 'src/app/core/utils/supplier-orders.util'
import type { MenuEvent } from '@models/menu-event.model'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { UserService } from '@services/user.service'

/**
 * "הזמנות לספקים" (plan 435) — one order card per supplier for a menu, ready to copy or to send to the
 * supplier's WhatsApp. Quantities come from the engine plan; nothing is saved. Opened from the menu page.
 */
@Component({
  selector: 'app-supplier-orders',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, EmptyStateComponent],
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
  protected readonly empty_ = computed(() => this.plan_().rawLines.length === 0)
  private readonly header_ = computed<OrderHeader>(() => {
    const event = this.event()
    return {
      business: this.userService_.user_()?.name ?? '',
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
