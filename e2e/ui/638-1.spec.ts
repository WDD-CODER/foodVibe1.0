import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('638-1: the history of a business is closed until its button is pressed', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/admin/businesses/*/platform-history', (route) =>
    route.fulfill({
      json: {
        rows: [{ at: 1760000000000, by: 'u1', byName: 'דנה', reason: 'בדיקת היסטוריה', changed: ['modules'] }]
      }
    })
  )
  await page.goto('/platform')
  await page.locator('[data-testid="biz-edit"]').first().click({ force: true })
  await expect(page.locator('[data-testid="biz-dialog"]')).toBeVisible()
  await expect(page.locator('[data-testid="biz-history"]')).toHaveCount(0)
  await page.locator('[data-testid="biz-history-open"]').click()
  await expect(page.getByText('היסטוריית שינויים', { exact: true })).toBeVisible()
  await expect(page.getByText('בדיקת היסטוריה')).toBeVisible()
  await page.screenshot({ path: 'screens/638-1.png' })
  await page.locator('[data-testid="biz-history-close"]').click()
  await expect(page.locator('[data-testid="biz-history"]')).toHaveCount(0)
  await expect(page.getByText('בדיקת היסטוריה')).toHaveCount(0)
})
