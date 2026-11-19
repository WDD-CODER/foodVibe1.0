import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const NAME = 'E2E 637 קמח'

test('637-1: a pasted count fills the product row with the mark "הצעת AI"', async ({ page, context, request }) => {
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
    await page.route('**/api/v1/ai/stock/extract', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          draftId: null,
          lines: [{ productId, quantity: 4, unit: 'kg' }],
          unmatched: []
        })
      })
    )
    await page.goto('/inventory/count')
    await page.getByTestId('stk-ai-open').click()
    await page.locator('app-voice-note textarea').fill('קמח 4 קילו')
    await page.locator('app-voice-note .voice-note-send').click()
    const row = page.locator('[data-testid="stk-row"]', { hasText: NAME })
    await expect(row.getByText('הצעת AI')).toBeVisible()
    await page.screenshot({ path: 'screens/637-1.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
  }
})
