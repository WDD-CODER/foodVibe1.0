import { Injectable, inject } from '@angular/core'
import type { Product } from '@models/product.model'
import { foldProductName, matchProductName, type ProductNameMatch } from '@utils/product-name-match.util'
import { KitchenStateService } from './kitchen-state.service'
import { GeminiService } from './gemini.service'
import { LoggingService } from './logging.service'

/** Mirrors PRODUCT_MATCH_MAX_NAMES / PRODUCT_MATCH_MAX_PRODUCTS in shared/schemas/ai-product-match.schema.ts. */
const MAX_NAMES = 200
const MAX_PRODUCTS = 1000
const MAX_NAME_CHARS = 200
const MAX_UNIT_CHARS = 40
const PREFIX_LENGTH = 2

export interface NameMatchItem {
  /** Caller's own handle for this name (a row id, an import line number). */
  key: string
  name: string
  unit?: string
}

export interface NameMatchResult {
  product: Product
  via: 'exact' | 'variant' | 'ai'
}

export interface NameMatchOptions {
  /** Called once when the AI step failed (HTTP error, quota); the leftover names are simply left out of the result. */
  onAiFailure?: (error: unknown) => void
}

/**
 * Plan 463 — the one place that links a typed or pasted product name to an existing product.
 * Tier 1 exact and tier 2 variant (plural / spelling) run in the browser over `KitchenStateService.products_()`
 * the names they cannot settle go to ONE AI call (names and units only). Plan 464 reuses it for the import page.
 */
@Injectable({ providedIn: 'root' })
export class ProductNameMatcherService {
  private readonly kitchenState_ = inject(KitchenStateService)
  private readonly gemini_ = inject(GeminiService)
  private readonly logging_ = inject(LoggingService)

  /** Sync tier 1-2 lookup over the products the user may see (cheap enough to re-run on every edit). */
  matchExact(name: string): ProductNameMatch<Product> | null {
    return matchProductName(name, this.kitchenState_.products_())
  }

  /**
   * Tier 1-2 for every item, then one AI call for the rest. Never throws. Items with no result are
   * absent from the map (no call when nothing is left to ask or there are no products).
   */
  async matchNames(
    items: readonly NameMatchItem[],
    options: NameMatchOptions = {}
  ): Promise<Map<string, NameMatchResult>> {
    const result = new Map<string, NameMatchResult>()
    const products = this.kitchenState_.products_()
    const leftover: NameMatchItem[] = []
    for (const item of items) {
      if (!item.name.trim()) continue
      const hit = matchProductName(item.name, products)
      if (hit && hit.kind !== 'ambiguous') result.set(item.key, { product: hit.product, via: hit.kind })
      else leftover.push(item)
    }
    if (leftover.length === 0 || products.length === 0) return result

    const asked = leftover.slice(0, MAX_NAMES)
    const candidates = this.candidates_(products, asked)
    if (candidates.length === 0) return result
    try {
      const matches = await this.gemini_.matchProductNames(
        asked.map((it) => ({ name: it.name.slice(0, MAX_NAME_CHARS), unit: (it.unit ?? '').slice(0, MAX_UNIT_CHARS) })),
        candidates.map((p) => ({
          name: p.nameHebrew.slice(0, MAX_NAME_CHARS),
          unit: (p.baseUnit ?? '').slice(0, MAX_UNIT_CHARS)
        }))
      )
      for (const m of matches) {
        const item = asked[m.i]
        const product = m.product === null ? undefined : candidates[m.product]
        if (item && product && !result.has(item.key)) result.set(item.key, { product, via: 'ai' })
      }
    } catch (err) {
      this.logging_.error({
        event: 'product_name_match.ai_failed',
        message: 'AI product name matching failed',
        context: { names: asked.length, products: candidates.length }
      })
      options.onAiFailure?.(err)
    }
    return result
  }

  /** The product list the AI may choose from: all of it, or (over 1000) those sharing a name start with a leftover name. */
  private candidates_(products: readonly Product[], asked: readonly NameMatchItem[]): Product[] {
    const named = products.filter((p) => (p.nameHebrew ?? '').trim())
    if (named.length <= MAX_PRODUCTS) return named
    const prefixes = new Set(asked.flatMap((it) => this.prefixes_(it.name)))
    return named.filter((p) => this.prefixes_(p.nameHebrew).some((x) => prefixes.has(x))).slice(0, MAX_PRODUCTS)
  }

  private prefixes_(name: string): string[] {
    const first = foldProductName(name)[0] ?? []
    return first.map((k) => k.slice(0, PREFIX_LENGTH))
  }
}
