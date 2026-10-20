import type { Ingredient } from '@models/ingredient.model'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { optionRateInBase } from '../utils/purchase-option-rate.util'
import type {
  DishCost,
  EngineError,
  EventPlan,
  EventPlanInput,
  MissingItem,
  PrepLine,
  RawLine,
  RawLineStatus
} from './event-plan.types'
import { roundPortions } from './rounding'
import { chooseSupplier } from './supplier-choice'
import { normalizeUnit, toBase, toYield } from './units'

/** One ingredient row's amount, before it is merged into a raw line. */
interface Contribution {
  key: string
  productId: string | null
  product: Product | null
  name: string
  unit: string
  net: number
  status: RawLineStatus
  /** The recipe whose ingredient row this came from. */
  recipeId: string
}

interface LineAcc {
  key: string
  productId: string | null
  product: Product | null
  name: string
  unit: string
  net: number
  status: RawLineStatus
  dishIds: Set<string>
  recipeIds: Set<string>
}

interface Price {
  supplierId: string | null
  perBase: number | null
}

interface ItemContext {
  dish: Recipe
  contributions: Contribution[]
  errored: boolean
}

function isDish(recipe: Recipe): boolean {
  return recipe.recipeType === 'dish' || !!recipe.prepItems?.length || !!recipe.prepCategories?.length
}

/**
 * Plan 433 — the one quantity and cost engine (spec 04.1). Pure: no I/O, no Angular, never mutates its input.
 * Expands preps (any depth) into raw product lines, prep lines and a cost per dish and per event.
 */
export function computeEventPlan(input: EventPlanInput): EventPlan {
  const productsById = new Map(input.products.map((p) => [p._id, p]))
  const recipesById = new Map(input.recipes.map((r) => [r._id, r]))
  const units = input.units

  const lines = new Map<string, LineAcc>()
  const prepLines: PrepLine[] = []
  const dishCosts: DishCost[] = []
  const errors: EngineError[] = []
  const missing: MissingItem[] = []
  const priceCache = new Map<string, Price>()

  const priceOf = (product: Product): Price => {
    const cached = priceCache.get(product._id)
    if (cached) return cached
    const choice = chooseSupplier(product)
    let price: Price = { supplierId: choice.supplierId, perBase: choice.pricePerBaseUnit }
    if (price.perBase == null) {
      for (const opt of product.purchaseOptions ?? []) {
        if (!(opt.priceOverride != null && opt.priceOverride > 0)) continue
        const rate = optionRateInBase(product, opt, units)
        if (rate > 0) {
          price = { supplierId: null, perBase: opt.priceOverride / rate }
          break
        }
      }
    }
    priceCache.set(product._id, price)
    return price
  }

  const wasteDivisor = (product: Product): number => (product.yieldFactor > 0 ? product.yieldFactor : 1)

  const addError = (ctx: ItemContext, error: EngineError): void => {
    ctx.errored = true
    if (!errors.some((e) => e.kind === error.kind && e.name === error.name)) errors.push(error)
  }

  const addMissing = (item: MissingItem): void => {
    const found = missing.find((m) => m.kind === item.kind && m.name === item.name && m.productId === item.productId)
    if (!found) {
      missing.push({ ...item, recipeIds: [...new Set(item.recipeIds)] })
      return
    }
    for (const id of item.recipeIds) if (!found.recipeIds.includes(id)) found.recipeIds.push(id)
  }

  const walk = (recipe: Recipe, factor: number, path: string[], ctx: ItemContext): void => {
    const ingredients = recipe.ingredients ?? []
    const mise = isDish(recipe) ? collectMise(recipe) : []
    if (!ingredients.length && !mise.length) addError(ctx, { kind: 'no_ingredients', name: recipe.nameHebrew })

    for (const ing of ingredients) walkIngredient(recipe, ing, factor, path, ctx)

    for (const row of mise) {
      prepLines.push({
        prepId: 'mise:' + row.name,
        name: row.name,
        qty: row.quantity * factor,
        unit: row.unit,
        dishId: ctx.dish._id,
        station: (ctx.dish.defaultStation ?? '').trim(),
        category: row.categoryName,
        source: 'mise'
      })
    }
  }

  const walkIngredient = (recipe: Recipe, ing: Ingredient, factor: number, path: string[], ctx: ItemContext): void => {
    const amount = (ing.amount ?? 0) * factor
    const unit = ing.unit ?? ''
    const ref = ing.referenceId

    if (!ref) {
      const name = (ing.nameSnapshot ?? '').trim()
      ctx.contributions.push({
        key: `unlinked|${name}|${unit}`,
        productId: null,
        product: null,
        name,
        unit,
        net: amount,
        status: 'unlinked',
        recipeId: recipe._id
      })
      return
    }

    const product = ing.type === 'recipe' ? undefined : productsById.get(ref)
    if (product) {
      const base = toBase(amount, unit, product, units)
      if (base == null) {
        ctx.contributions.push({
          key: `${product._id}|${normalizeUnit(unit)}`,
          productId: product._id,
          product,
          name: product.nameHebrew,
          unit,
          net: amount,
          status: 'no_conversion',
          recipeId: recipe._id
        })
      } else {
        ctx.contributions.push({
          key: product._id,
          productId: product._id,
          product,
          name: product.nameHebrew,
          unit: product.baseUnit || 'gram',
          net: base,
          status: 'ok',
          recipeId: recipe._id
        })
      }
      return
    }

    const prep = ing.type === 'product' ? undefined : recipesById.get(ref)
    if (prep) {
      if (path.includes(prep._id)) {
        addError(ctx, { kind: 'cycle', name: prep.nameHebrew })
        return
      }
      if (!(prep.yieldAmount > 0)) {
        addError(ctx, { kind: 'no_yield', name: prep.nameHebrew })
        return
      }
      const qty = toYield(amount, unit, prep, units)
      if (qty == null) {
        addError(ctx, { kind: 'no_conversion', name: prep.nameHebrew })
        return
      }
      const prepLine: PrepLine = {
        prepId: prep._id,
        name: prep.nameHebrew,
        qty,
        unit: prep.yieldUnit || 'unit',
        dishId: ctx.dish._id,
        station: (ctx.dish.defaultStation ?? '').trim(),
        category: prep.course ?? '',
        source: 'prep'
      }
      if (ing.note) prepLine.note = ing.note
      prepLines.push(prepLine)
      walk(prep, qty / prep.yieldAmount, [...path, prep._id], ctx)
      return
    }

    ctx.contributions.push({
      key: `deleted|${ref}`,
      productId: null,
      product: null,
      name: (ing.nameSnapshot ?? '').trim() || ref,
      unit,
      net: amount,
      status: 'deleted',
      recipeId: recipe._id
    })
  }

  input.event.sections.forEach((section) => {
    section.items.forEach((item, index) => {
      const itemKey = `${section._id}|${index}`
      const recipe = recipesById.get(item.recipeId)
      if (!recipe) {
        addMissing({ kind: 'deleted', name: item.recipeId, recipeIds: [item.recipeId] })
        dishCosts.push({ itemKey, recipeId: item.recipeId, cost: 0, partial: true })
        return
      }
      const ctx: ItemContext = { dish: recipe, contributions: [], errored: false }
      const dish = isDish(recipe)
      const rawPortions = input.portionsByItem.get(itemKey) ?? 0
      const portions = dish ? roundPortions(rawPortions) : rawPortions

      if (!(recipe.yieldAmount > 0)) {
        addError(ctx, { kind: 'no_yield', name: recipe.nameHebrew })
        dishCosts.push({ itemKey, recipeId: recipe._id, cost: 0, partial: true })
        return
      }

      if (portions > 0) {
        if (!dish) {
          prepLines.push({
            prepId: recipe._id,
            name: recipe.nameHebrew,
            qty: portions,
            unit: recipe.yieldUnit || 'unit',
            dishId: recipe._id,
            station: (recipe.defaultStation ?? '').trim(),
            category: recipe.course ?? '',
            source: 'prep'
          })
        }
        walk(recipe, portions / recipe.yieldAmount, [recipe._id], ctx)
      }

      let cost = 0
      let partial = ctx.errored
      for (const c of ctx.contributions) {
        const acc = lines.get(c.key)
        if (acc) acc.net += c.net
        else {
          lines.set(c.key, {
            key: c.key,
            productId: c.productId,
            product: c.product,
            name: c.name,
            unit: c.unit,
            net: c.net,
            status: c.status,
            dishIds: new Set(),
            recipeIds: new Set()
          })
        }
        const line = lines.get(c.key) as LineAcc
        line.dishIds.add(recipe._id)
        line.recipeIds.add(c.recipeId)

        const perBase = c.status === 'ok' && c.product ? priceOf(c.product).perBase : null
        if (perBase == null || !c.product) partial = true
        else cost += (c.net / wasteDivisor(c.product)) * perBase
      }
      dishCosts.push({ itemKey, recipeId: recipe._id, cost, partial })
    })
  })

  const rawLines: RawLine[] = []
  for (const acc of lines.values()) {
    const dishIds = [...acc.dishIds]
    if (acc.status !== 'ok' || !acc.product) {
      rawLines.push({
        productId: acc.productId,
        name: acc.name,
        unit: acc.unit,
        netQty: acc.net,
        buyQty: acc.net,
        supplierId: null,
        lineCost: null,
        dishIds,
        status: acc.status
      })
      if (acc.status === 'unlinked' || acc.status === 'deleted') {
        const item: MissingItem = { kind: acc.status, name: acc.name, recipeIds: [...acc.recipeIds] }
        if (acc.status === 'deleted') item.productId = acc.key.slice('deleted|'.length)
        addMissing(item)
      }
      continue
    }
    const product = acc.product
    const buyQty = acc.net / wasteDivisor(product)
    const price = priceOf(product)
    const line: RawLine = {
      productId: acc.productId,
      name: acc.name,
      unit: acc.unit,
      netQty: acc.net,
      buyQty,
      supplierId: price.supplierId,
      lineCost: price.perBase == null ? null : buyQty * price.perBase,
      dishIds,
      status: 'ok'
    }
    const baseKey = normalizeUnit(product.baseUnit || 'gram')
    for (const opt of product.purchaseOptions ?? []) {
      if (normalizeUnit(opt.unitSymbol) === baseKey) continue
      const rate = optionRateInBase(product, opt, units)
      if (rate > 0) {
        line.purchase = { unit: opt.unitSymbol, count: buyQty / rate }
        break
      }
    }
    rawLines.push(line)
    if (line.lineCost == null) {
      addMissing({ kind: 'unpriced', productId: product._id, name: acc.name, recipeIds: [...acc.recipeIds] })
    }
  }

  const eventFoodCost = dishCosts.reduce((sum, d) => sum + d.cost, 0)
  const partial = dishCosts.some((d) => d.partial) || errors.length > 0 || missing.length > 0

  return { rawLines, prepLines, dishCosts, eventFoodCost, partial, missing, errors }
}

interface MiseRow {
  name: string
  quantity: number
  unit: string
  categoryName: string
}

/** A dish's own prepItems and prepCategories, de-duplicated like `ScalingService.getScaledPrepItems`. */
function collectMise(recipe: Recipe): MiseRow[] {
  const rows: MiseRow[] = []
  for (const p of recipe.prepItems ?? []) {
    rows.push({
      name: p.preparationName,
      quantity: p.quantity ?? 0,
      unit: p.unit ?? 'unit',
      categoryName: p.categoryName ?? ''
    })
  }
  for (const cat of recipe.prepCategories ?? []) {
    for (const it of cat.items ?? []) {
      if (rows.some((r) => r.name === it.itemName && r.categoryName === (cat.categoryName ?? ''))) continue
      rows.push({
        name: it.itemName,
        quantity: it.quantity ?? 0,
        unit: it.unit ?? 'unit',
        categoryName: cat.categoryName ?? ''
      })
    }
  }
  return rows
}
