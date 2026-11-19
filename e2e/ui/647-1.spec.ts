import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('647-1: the learning section shows a card per AI action and three supplier-memory tiles', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.route('**/api/v1/admin/learning/status', (route) => route.fulfill({ json: { fileStore: true } }))
  await page.route('**/api/v1/admin/learning/stats**', (route) =>
    route.fulfill({
      json: {
        days: 90,
        from: '2026-08-20',
        to: '2026-11-18',
        flows: [
          { feature: 'invoice_read', model: null, drafts: 9, confirmed: 1, avgKeptRatio: 1, weeks: [] },
          { feature: 'invoice_read', model: 'gemini-x', drafts: 8, confirmed: 6, avgKeptRatio: 0.8, weeks: [] }
        ],
        brain: { suppliers: 2, names: 3, businesses: 2 },
        privateBusinesses: 0,
        truncated: false
      }
    })
  )
  await page.goto('/platform')
  const section = page.getByTestId('platform-learning')
  await expect(section.getByTestId('learning-flow-card')).toHaveCount(2, { timeout: 30000 })
  await expect(section.getByTestId('learning-tile')).toHaveCount(3)
  await page.screenshot({ path: 'screens/647-1.png' })
})
