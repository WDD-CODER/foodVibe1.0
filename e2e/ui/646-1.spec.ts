import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('646-1: the bell on the dashboard shows 1 and the list shows the alert text', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/notifications?*', (route) =>
    route.fulfill({
      json: {
        unread: 1,
        rows: [
          {
            _id: 'a1',
            businessId: 'fixture',
            userId: 'fixture',
            kind: 'price_change',
            productId: 'p1',
            productName: 'לחם',
            supplierName: 'ספק א',
            from: 100,
            to: 106,
            changePct: 6,
            createdAt: Date.now(),
            businessName: 'עסק'
          }
        ]
      }
    })
  )
  await page.goto('/dashboard')
  const count = page.locator('[data-testid="notification-count"]')
  await expect(count).toHaveText('1', { timeout: 30000 })
  await page.locator('[data-testid="notification-bell"]').click()
  await expect(page.locator('[data-testid="notification-item"]').first()).toContainText('לחם')
  await page.screenshot({ path: 'screens/646-1.png' })
})
