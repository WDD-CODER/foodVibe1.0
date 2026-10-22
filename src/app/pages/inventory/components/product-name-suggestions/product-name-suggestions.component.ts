import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { Router } from '@angular/router'
import { KitchenStateService } from '@services/kitchen-state.service'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'
import { filterOptionsByLabel } from 'src/app/core/utils/option-filter.util'

const MIN_LETTERS = 2
const MAX_SUGGESTIONS = 5

/**
 * Plan 461 - existing products whose name contains the text typed in the product-name box, listed under it
 * (add-option rule F: those starting with the text first). A click, or Enter on a row, opens that product.
 * Part of the page flow, not a floating layer. Escape hides the list until the text changes.
 */
@Component({
  selector: 'app-product-name-suggestions',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './product-name-suggestions.component.html',
  styleUrl: './product-name-suggestions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductNameSuggestionsComponent {
  private readonly router = inject(Router)
  private readonly kitchenState = inject(KitchenStateService)

  /** The text typed in the name box. */
  readonly query = input('')
  /** The product being edited (never suggested to itself), or null when adding. */
  readonly currentId = input<string | null>(null)

  /** The text for which Escape hid the list. */
  private readonly dismissedFor_ = signal<string | null>(null)

  protected readonly matches_ = computed(() => {
    const text = (this.query() ?? '').trim()
    if (text.length < MIN_LETTERS || this.dismissedFor_() === text) return []
    const others = this.kitchenState.products_().filter((p) => p._id !== this.currentId())
    return filterOptionsByLabel(others, text, (p) => p.nameHebrew ?? '').slice(0, MAX_SUGGESTIONS)
  })

  protected open_(id: string): void {
    void this.router.navigate(['/inventory/edit', id])
  }

  /** Hides the list for the text now typed (Escape in the name box or in the list). */
  dismiss(): void {
    this.dismissedFor_.set((this.query() ?? '').trim())
  }
}
