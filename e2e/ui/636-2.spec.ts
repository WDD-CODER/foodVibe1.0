import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const NAME = 'E2E 636 קמח'

test('636-2: setting an amount and pressing "שמירת טיוטה" shows "הטיוטה נשמרה"', async ({ page, context, request }) => {
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
      minStockLevel: 0,
      expiryDaysDefault: 0
    }
  })
  expect(res.ok()).toBeTruthy()
  const productId = ((await res.json()) as { _id: string })._id
  try {
    await page.goto('/inventory/count')
    const row = page.locator('[data-testid="stk-row"]', { hasText: NAME })
    await row.locator('app-counter input').fill('3')
    await row.locator('app-counter input').press('Enter')
    await page.getByTestId('stk-save-draft').click()
    await expect(page.getByText('הטיוטה נשמרה')).toBeVisible()
    await page.screenshot({ path: 'screens/636-2.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
  }
})
