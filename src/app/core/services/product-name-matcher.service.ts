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
/** Mirrors PRODUCT_MATCH_MAX_OPTIONS in shared/schemas/ai-product-match.schema.ts (plan 490). */
const MAX_OPTIONS = 5

export interface NameMatchItem {
  /** Caller's own handle for this name (a row id, an import line number). */
  key: string
  name: string
  unit?: string
  /** Plan 490: false = never link this name, only collect options for it (a pasted line without an amount). */
  linkable?: boolean
}

export interface NameMatchResult {
  product: Product
  via: 'exact' | 'variant' | 'ai'
}

/** Plan 490 — the links plus, per unlinked key, the products the name could mean (max 5, best first). */
export interface NameMatchOutcome {
  linked: Map<string, NameMatchResult>
  options: Map<string, Product[]>
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
   * Plan 490: delegates to `matchNamesWithOptions` and keeps only the links (the import page ignores options).
   */
  async matchNames(
    items: readonly NameMatchItem[],
    options: NameMatchOptions = {}
  ): Promise<Map<string, NameMatchResult>> {
    return (await this.matchNamesWithOptions(items, options)).linked
  }

  /**
   * Plan 490 — like `matchNames`, plus the products a name COULD mean when nothing links it: the AI's `options`
   * (model order) then the local tier-2 ambiguous candidates, max 5. A `linkable: false` item is never linked:
   * its exact/variant/AI product becomes a one-item option. An AI failure still returns the local options.
   */
  async matchNamesWithOptions(
    items: readonly NameMatchItem[],
    options: NameMatchOptions = {}
  ): Promise<NameMatchOutcome> {
    const linked = new Map<string, NameMatchResult>()
    const local = new Map<string, Product[]>()
    const ai = new Map<string, Product[]>()
    const products = this.kitchenState_.products_()
    const leftover: NameMatchItem[] = []
    for (const item of items) {
      if (!item.name.trim()) continue
      const hit = matchProductName(item.name, products)
      if (hit?.kind === 'ambiguous') local.set(item.key, hit.candidates)
      else if (hit) {
        if (item.linkable === false) local.set(item.key, [hit.product])
        else linked.set(item.key, { product: hit.product, via: hit.kind })
        continue
      }
      leftover.push(item)
    }
    const asked = leftover.slice(0, MAX_NAMES)
    const candidates = asked.length > 0 ? this.candidates_(products, asked) : []
    if (candidates.length > 0) {
      try {
        const matches = await this.gemini_.matchProductNames(
          asked.map((it) => ({
            name: it.name.slice(0, MAX_NAME_CHARS),
            unit: (it.unit ?? '').slice(0, MAX_UNIT_CHARS)
          })),
          candidates.map((p) => ({
            name: p.nameHebrew.slice(0, MAX_NAME_CHARS),
            unit: (p.baseUnit ?? '').slice(0, MAX_UNIT_CHARS)
          }))
        )
        for (const m of matches) {
          const item = asked[m.i]
          if (!item || linked.has(item.key) || ai.has(item.key)) continue
          const product = m.product === null ? undefined : candidates[m.product]
          if (product && item.linkable !== false) linked.set(item.key, { product, via: 'ai' })
          else ai.set(item.key, product ? [product] : (m.options ?? []).map((n) => candidates[n]))
        }
      } catch (err) {
        this.logging_.error({
          event: 'product_name_match.ai_failed',
          message: 'AI product name matching failed',
          context: { names: asked.length, products: candidates.length }
        })
        options.onAiFailure?.(err)
      }
    }
    // AI options first (model order), then the local ones; no duplicate _id, max 5, none for a linked key.
    const merged = new Map<string, Product[]>()
    for (const [key, list] of [...ai, ...local]) {
      if (linked.has(key)) continue
      const all = [...(merged.get(key) ?? []), ...list].filter((p) => !!p)
      const unique = all.filter((p, n) => all.findIndex((x) => x._id === p._id) === n).slice(0, MAX_OPTIONS)
      if (unique.length > 0) merged.set(key, unique)
    }
    return { linked, options: merged }
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
