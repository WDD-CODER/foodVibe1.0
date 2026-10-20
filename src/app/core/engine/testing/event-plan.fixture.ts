import type { Ingredient } from '@models/ingredient.model'
import type { MenuEvent } from '@models/menu-event.model'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import type { Supplier } from '@models/supplier.model'
import { SYSTEM_UNITS } from '@services/unit-registry.service'
import type { EventPlanInput, UnitConversion } from '../event-plan.types'
import { portionsFromDerived } from '../portions-from-derived'

/** Ids of the 04.1 fixture, so specs of later plans (434, 435, 437) assert the same objects. */
export const FIXTURE_IDS = {
  tomato: 'p-tomato',
  oliveOil: 'p-olive-oil',
  lemon: 'p-lemon',
  salad: 'r-salad',
  sauce: 'r-sauce',
  pasta: 'r-pasta',
  supplierA: 's-a',
  supplierB: 's-b',
  event: 'e-test',
  section: 'sec-1'
} as const

export const FIXTURE_SUPPLIERS: Supplier[] = [
  {
    _id: FIXTURE_IDS.supplierA,
    nameHebrew: 'ספק א',
    phone: '050-1234567',
    deliveryDays: [],
    minOrderMov: 0,
    leadTimeDays: 1
  },
  {
    _id: FIXTURE_IDS.supplierB,
    nameHebrew: 'ירקן',
    phone: '052-7654321',
    deliveryDays: [],
    minOrderMov: 0,
    leadTimeDays: 1
  }
]

export const FIXTURE_UNITS: UnitConversion = {
  getConversion: (key: string): number => SYSTEM_UNITS[key] || 1,
  has: (key: string): boolean => key in SYSTEM_UNITS
}

export function makeProduct(partial: Partial<Product> & Pick<Product, '_id' | 'nameHebrew'>): Product {
  return {
    baseUnit: 'kg',
    sources: [],
    purchaseOptions: [],
    categories: [],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0,
    ...partial
  }
}

export function makeRecipe(partial: Partial<Recipe> & Pick<Recipe, '_id' | 'nameHebrew'>): Recipe {
  return {
    ingredients: [],
    steps: [],
    yieldAmount: 1,
    yieldUnit: 'kg',
    defaultStation: '',
    isApproved: true,
    recipeType: 'preparation',
    ...partial
  }
}

export function productIng(referenceId: string, amount: number, unit: string, nameSnapshot = ''): Ingredient {
  return { _id: `i-${referenceId}-${amount}-${unit}`, referenceId, type: 'product', amount, unit, nameSnapshot }
}

export function recipeIng(referenceId: string, amount: number, unit: string, nameSnapshot = ''): Ingredient {
  return { _id: `i-${referenceId}-${amount}-${unit}`, referenceId, type: 'recipe', amount, unit, nameSnapshot }
}

export function makeEvent(
  items: { recipeId: string; derivedPortions: number; recipeType?: 'dish' | 'preparation' }[]
): MenuEvent {
  return {
    _id: FIXTURE_IDS.event,
    name: 'אירוע בדיקה',
    eventType: 'test',
    eventDate: '2026-11-20',
    servingType: 'buffet_family',
    guestCount: 100,
    sections: [
      {
        _id: FIXTURE_IDS.section,
        name: 'עיקריות',
        sortOrder: 0,
        items: items.map((i) => ({
          recipeId: i.recipeId,
          recipeType: i.recipeType ?? 'dish',
          predictedTakeRate: 1,
          derivedPortions: i.derivedPortions
        }))
      }
    ]
  }
}

/** A plan input around the given event with the shared units; used by the edge-case specs. */
export function makeInput(event: MenuEvent, products: Product[], recipes: Recipe[]): EventPlanInput {
  return { event, portionsByItem: portionsFromDerived(event), products, recipes, units: FIXTURE_UNITS }
}

/**
 * The spec 04.1 acceptance fixture: dish סלט (10 portions) = 500 g tomato + 200 g prep רוטב
 * רוטב (1 kg) = 800 g olive oil + 0.2 kg lemon; dish פסטה (5 portions) = 1 kg tomato
 * event: 100 portions סלט + 50 portions פסטה. A fresh object on every call, safe to mutate.
 */
export function buildFixtureInput(): EventPlanInput {
  const tomato = makeProduct({
    _id: FIXTURE_IDS.tomato,
    nameHebrew: 'עגבנייה',
    baseUnit: 'kg',
    yieldFactor: 0.8,
    sources: [
      { supplierId: FIXTURE_IDS.supplierA, price: 6 },
      { supplierId: FIXTURE_IDS.supplierB, price: 5 }
    ],
    purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg' }]
  })
  const oliveOil = makeProduct({
    _id: FIXTURE_IDS.oliveOil,
    nameHebrew: 'שמן זית',
    baseUnit: 'kg',
    sources: [{ supplierId: FIXTURE_IDS.supplierB, price: 40 }]
  })
  const lemon = makeProduct({ _id: FIXTURE_IDS.lemon, nameHebrew: 'לימון', baseUnit: 'kg' })

  const salad = makeRecipe({
    _id: FIXTURE_IDS.salad,
    nameHebrew: 'סלט',
    recipeType: 'dish',
    yieldAmount: 10,
    yieldUnit: 'portion',
    ingredients: [
      productIng(FIXTURE_IDS.tomato, 500, 'gram', 'עגבנייה'),
      recipeIng(FIXTURE_IDS.sauce, 200, 'gram', 'רוטב')
    ]
  })
  const sauce = makeRecipe({
    _id: FIXTURE_IDS.sauce,
    nameHebrew: 'רוטב',
    recipeType: 'preparation',
    yieldAmount: 1,
    yieldUnit: 'kg',
    ingredients: [
      productIng(FIXTURE_IDS.oliveOil, 800, 'gram', 'שמן זית'),
      productIng(FIXTURE_IDS.lemon, 0.2, 'kg', 'לימון')
    ]
  })
  const pasta = makeRecipe({
    _id: FIXTURE_IDS.pasta,
    nameHebrew: 'פסטה',
    recipeType: 'dish',
    yieldAmount: 5,
    yieldUnit: 'portion',
    ingredients: [productIng(FIXTURE_IDS.tomato, 1, 'kg', 'עגבנייה')]
  })

  const event = makeEvent([
    { recipeId: FIXTURE_IDS.salad, derivedPortions: 100 },
    { recipeId: FIXTURE_IDS.pasta, derivedPortions: 50 }
  ])
  return makeInput(event, [tomato, oliveOil, lemon], [salad, sauce, pasta])
}
