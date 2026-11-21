import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const DIAGNOSIS = {
  _id: 'qa-diag',
  name: 'QA diagnosis',
  periodDays: 60,
  menu: [{ name: 'פסטה', sellPrice: 40, dishId: 'qa-dish' }],
  pricesIncludeVat: false,
  vatPct: 18,
  invoiceIds: [],
  status: 'open',
  createdAt: 1763500000000,
  updatedAt: 1763500000000
}

// One dish that costs 35 per portion: a single product at 35 per unit.
const PRODUCT = {
  _id: 'qa-prod',
  nameHebrew: 'מוצר בדיקה',
  baseUnit: 'unit',
  sources: [{ supplierId: 'qa-sup', price: 35 }],
  purchaseOptions: [],
  categories: [],
  yieldFactor: 1,
  allergens: []
}
const DISH = {
  _id: 'qa-dish',
  nameHebrew: 'פסטה',
  recipeType: 'dish',
  yieldAmount: 1,
  yieldUnit: 'unit',
  ingredients: [{ type: 'product', referenceId: 'qa-prod', amount: 1, unit: 'unit', nameSnapshot: 'מוצר בדיקה' }]
}

test('634-1: the report marks a dish under the profit target', async ({ page, context }) => {
  await signInQa(context)
  // The QA business does not have the consultant_diag module: the spec answers the diagnosis calls itself.
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'consultant_diag'] } })
  })
  await page.route('**/api/v1/diag/**', (route) => route.fulfill({ json: { diagnosis: DIAGNOSIS, volatility: [] } }))
  await page.route('**/api/v1/data/diagnoses**', (route) => route.fulfill({ json: [DIAGNOSIS] }))
  await page.route('**/api/v1/data/dishes**', (route) => route.fulfill({ json: [DISH] }))
  await page.route('**/api/v1/data/products**', (route) => route.fulfill({ json: [PRODUCT] }))

  await page.goto('/diagnosis/qa-diag')
  await page.getByRole('tab', { name: 'דוח' }).click()
  const row = page.locator('[data-testid="diag-dish-row"]', { hasText: 'פסטה' })
  await expect(row.getByText('מתחת ליעד')).toBeVisible()
  await page.screenshot({ path: 'screens/634-1.png' })
})
