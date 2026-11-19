import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const NAME = 'E2E 637 קמח'

test('637-2: a word the server did not recognise is listed under "לא זוהו"', async ({ page, context, request }) => {
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
        body: JSON.stringify({ draftId: null, lines: [], unmatched: [{ spoken: 'בננות' }] })
      })
    )
    await page.goto('/inventory/count')
    await page.getByTestId('stk-ai-open').click()
    await page.locator('app-voice-note textarea').fill('בננות')
    await page.locator('app-voice-note .voice-note-send').click()
    const list = page.getByTestId('stk-ai-unmatched')
    await expect(list.getByText('לא זוהו', { exact: true })).toBeVisible()
    await expect(list.getByText('בננות')).toBeVisible()
    await page.screenshot({ path: 'screens/637-2.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/products/${productId}`, { headers })
  }
})
