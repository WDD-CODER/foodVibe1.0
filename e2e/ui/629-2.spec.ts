import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const PRODUCT_NAME = 'מוצר בדיקה 629'

test('629-2: the dashboard card shows the product whose price rose', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const res = await request.post(`${API}/api/v1/data/products`, {
    headers,
    data: {
      nameHebrew: PRODUCT_NAME,
      baseUnit: 'kg',
      sources: [],
      purchaseOptions: [],
      categories: [],
      yieldFactor: 1,
      allergens: [],
      minStockLevel: 0,
      expiryDaysDefault: 0
    }
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const productId = (body._id ?? body.data?._id) as string
  try {
    await page.route('**/api/v1/product-import/price-rises**', (route) =>
      route.fulfill({
        json: [{ productId, supplierId: '', from: 10, to: 11, changePct: 10, at: Date.now() - 86400000 }]
      })
    )
    await page.goto('/dashboard')
    const card = page.locator('[data-testid="price-rises-card"]')
    await expect(card).toContainText('מחירים שעלו ב-60 הימים האחרונים')
    await expect(card).toContainText(PRODUCT_NAME)
    await page.screenshot({ path: 'screens/629-2.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
  }
})
