import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const NAME = 'E2E 636 סוכר'

test('636-4: a product under its minimum after a final count is listed under "מתחת למינימום"', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const res = await request.post(`${API}/api/v1/data/products`, {
    headers,
    data: {
      nameHebrew: NAME,
      baseUnit: 'kg',
      sources: [],
      purchaseOptions: [],
      categories: [],
      yieldFactor: 1,
      allergens: [],
      minStockLevel: 10,
      expiryDaysDefault: 0
    }
  })
  expect(res.ok()).toBeTruthy()
  const productId = ((await res.json()) as { _id: string })._id
  try {
    const made = await request.post(`${API}/api/v1/stock/counts`, {
      headers,
      data: { countedAt: Date.now(), source: 'manual', lines: [{ productId, quantity: 4, unit: 'kg' }] }
    })
    expect(made.ok()).toBeTruthy()
    const countId = ((await made.json()) as { _id: string })._id
    const closed = await request.post(`${API}/api/v1/stock/counts/${countId}/finalize`, { headers, data: {} })
    expect(closed.ok()).toBeTruthy()

    await page.goto('/inventory/count')
    await page.getByRole('button', { name: /מתחת למינימום/ }).click()
    await expect(page.locator('[data-testid="stk-below-row"]', { hasText: NAME })).toBeVisible()
    await page.screenshot({ path: 'screens/636-4.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
  }
})
