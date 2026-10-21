import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { Router } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import type { MissingItem } from 'src/app/core/engine/event-plan.types'
import type { Product } from '@models/product.model'
import { ClickOutSideDirective } from '@directives/click-out-side'
import { KitchenStateService } from '@services/kitchen-state.service'
import { LoggingService } from '@services/logging.service'
import { PermissionService } from '@services/permission.service'
import { ProductDataService } from '@services/product-data.service'
import { TranslationService } from '@services/translation.service'
import { UserMsgService } from '@services/user-msg.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { isValidQuickPrice, withQuickPrice } from 'src/app/core/utils/quick-price.util'

interface MissingRow {
  key: string
  item: MissingItem
  recipeNames: string
  /** The recipe «פתח מתכון» opens; null when the recipe no longer exists. */
  openRecipeId: string | null
  product: Product | null
  canPrice: boolean
  unitLabel: string
}

/**
 * Plan 444 — the one "חלקי" badge. Shows nothing when `missing` is empty; otherwise an amber chip that opens
 * a popover listing what makes the total partial. The owner types a missing price right there; staff see a note.
 */
@Component({
  selector: 'app-partial-cost-badge',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe, ClickOutSideDirective],
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
  private readonly router_ = inject(Router)

  readonly missing = input<MissingItem[]>([])
  /** 'above' for a badge in a bar fixed to the bottom of the screen. */
  readonly placement = input<'below' | 'above'>('below')
  /** Names for recipe ids the kitchen state does not know yet (a recipe being built and not saved). */
  readonly recipeNames = input<Record<string, string>>({})

  protected readonly open_ = signal(false)
  protected readonly drafts_ = signal<Record<string, string>>({})
  protected readonly savingKey_ = signal<string | null>(null)
  /** True once the popover was opened by a click or a focus, so the mouse leaving does not close it. */
  private pinned_ = false

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
      const openRecipeId = recipeIds.find((id) => recipesById.has(id)) ?? null
      const product = item.kind === 'unpriced' && item.productId ? (productsById.get(item.productId) ?? null) : null
      return {
        key: `${item.kind}|${item.productId ?? item.name}`,
        item,
        recipeNames,
        openRecipeId,
        product,
        canPrice: !!product && this.permission_.can('editMoney', { type: 'products', doc: product }),
        unitLabel: product ? this.translation_.translate(product.baseUnit) : ''
      }
    })
  })

  protected toggle(): void {
    if (this.open_() && !this.pinned_) {
      this.pinned_ = true
      return
    }
    this.pinned_ = true
    this.open_.update((v) => !v)
  }

  protected onEnter(): void {
    if (this.open_() || !this.hoverCapable()) return
    this.pinned_ = false
    this.open_.set(true)
  }

  protected onLeave(): void {
    if (!this.pinned_) this.open_.set(false)
  }

  protected close(): void {
    this.open_.set(false)
    this.pinned_ = false
  }

  protected pin(): void {
    this.pinned_ = true
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

  protected openRecipe(row: MissingRow): void {
    if (!row.openRecipeId) return
    this.close()
    void this.router_.navigate(['/recipe-builder', row.openRecipeId])
  }

  private hoverCapable(): boolean {
    try {
      return typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches
    } catch {
      return false
    }
  }
}
