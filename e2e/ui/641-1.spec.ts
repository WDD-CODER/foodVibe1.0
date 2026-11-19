import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const SUPPLIER_A = 'ספק בדיקה 641 א'
const SUPPLIER_B = 'ספק בדיקה 641 ב'
const PRODUCT_NAME = 'מוצר בדיקה 641'

test('641-1: a product priced by another supplier shows the percent and the two choices', async ({
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
  const supplierA = await create('suppliers', { nameHebrew: SUPPLIER_A })
  const supplierB = await create('suppliers', { nameHebrew: SUPPLIER_B })
  const productId = await create('products', {
    nameHebrew: PRODUCT_NAME,
    baseUnit: 'kg',
    sources: [{ supplierId: supplierA, price: 100 }],
    purchaseOptions: [],
    categories: [],
    yieldFactor: 1,
    allergens: [],
    minStockLevel: 0,
    expiryDaysDefault: 0
  })
  try {
    await page.route('**/api/v1/ai/parse-price-list', (route) =>
      route.fulfill({
        json: {
          rows: [
            {
              name: PRODUCT_NAME,
              baseUnit: 'kg',
              price: 142,
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
    await page.locator('[data-testid="import-text"]').fill(`${PRODUCT_NAME} 142`)
    await page.locator('[data-testid="import-parse"]').click()
    await expect(page.locator('[data-testid="import-row"]')).toHaveCount(1)
    await page.locator('[data-testid="import-supplier"]').click()
    await page.getByText(SUPPLIER_B).first().click()
    await expect(page.locator('[data-testid="import-change"]')).toHaveText('+42.0%')
    const choice = page.locator('[data-testid="import-choice"]')
    await expect(choice).toContainText(`עדכון המחיר של ${SUPPLIER_A}`)
    await expect(choice).toContainText(`הוספת ${SUPPLIER_B} כספק נוסף`)
    await page.screenshot({ path: 'screens/641-1.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
    await request.delete(`${API}/api/v1/data/suppliers/${supplierA}`, { headers })
    await request.delete(`${API}/api/v1/data/suppliers/${supplierB}`, { headers })
  }
})
