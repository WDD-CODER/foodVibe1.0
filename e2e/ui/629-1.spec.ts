import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const SUPPLIER_NAME = 'ספק בדיקה 629'
const PRODUCT_NAME = 'מוצר בדיקה 629'
const RECIPE_NAME = 'מתכון בדיקה 629'

test('629-1: after saving a risen price the panel lists the recipe that uses the product', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const create = async (type: string, data: Record<string, unknown>): Promise<string> => {
    const res = await request.post(`${API}/api/v1/data/${type}`, { headers, data })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    return (body._id ?? body.data?._id) as string
  }
  const supplierId = await create('suppliers', { nameHebrew: SUPPLIER_NAME })
  const productId = await create('products', {
    nameHebrew: PRODUCT_NAME,
    baseUnit: 'kg',
    sources: [{ supplierId, price: 10 }],
    purchaseOptions: [],
    categories: [],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0
  })
  const recipeId = await create('recipes', {
    nameHebrew: RECIPE_NAME,
    ingredients: [{ _id: 'i629', type: 'product', referenceId: productId, amount: 1, unit: 'kg' }],
    steps: [],
    yieldAmount: 1,
    yieldUnit: 'kg',
    defaultStation: 'cold',
    isApproved: false,
    recipeType: 'preparation'
  })
  try {
    await page.route('**/api/v1/ai/parse-price-list', (route) =>
      route.fulfill({
        json: {
          rows: [
            {
              name: PRODUCT_NAME,
              baseUnit: 'kg',
              price: 12,
              purchaseUnit: null,
              purchaseQty: null,
              category: null,
              needsReview: false,
              duplicate: false
            }
          ],
          truncated: false
        }
      })
    )
    await page.route('**/api/v1/ai/match-product-names', (route) => route.fulfill({ json: { matches: [] } }))
    await page.goto('/inventory/import')
    await page.locator('[data-testid="import-text"]').fill(`${PRODUCT_NAME} 12`)
    await page.locator('[data-testid="import-parse"]').click()
    await expect(page.locator('[data-testid="import-row"]')).toHaveCount(1)
    await page.locator('[data-testid="import-supplier"]').click()
    await page.getByText(SUPPLIER_NAME).first().click()
    await page.locator('[data-testid="import-save"]').click()
    const panel = page.locator('[data-testid="price-impact"]')
    await expect(panel).toContainText('מה זה עושה למנות ולמתכונים')
    await expect(panel).toContainText(RECIPE_NAME)
    await page.screenshot({ path: 'screens/629-1.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/recipes/${recipeId}`, { headers })
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
    await request.delete(`${API}/api/v1/data/suppliers/${supplierId}`, { headers })
  }
})
