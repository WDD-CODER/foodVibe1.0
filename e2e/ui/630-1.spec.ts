import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('630-1: the learning section tells the admin that files are not being kept', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/admin/learning/status', (route) => route.fulfill({ json: { fileStore: false } }))
  await page.route('**/api/v1/admin/learning/stats**', (route) =>
    route.fulfill({
      json: {
        days: 90,
        from: '2026-08-20',
        to: '2026-11-18',
        flows: [
          {
            feature: 'invoice_read',
            model: null,
            drafts: 3,
            confirmed: 2,
            avgKeptRatio: 0.75,
            weeks: [{ week: '2026-11-15', drafts: 3, confirmed: 2, avgKeptRatio: 0.75 }]
          }
        ],
        brain: { suppliers: 2, names: 3, businesses: 2 },
        privateBusinesses: 0,
        truncated: false
      }
    })
  )
  await page.goto('/platform')
  const section = page.getByTestId('platform-learning')
  await expect(section).toContainText('למידת המערכת')
  await expect(section.getByTestId('learning-no-file-store')).toContainText('אחסון הקבצים הפרטי אינו מוגדר')
  await page.screenshot({ path: 'screens/630-1.png' })
})
