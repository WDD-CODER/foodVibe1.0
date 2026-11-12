import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('584-2: a QA user reaches the dashboard with no terms popup', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator('app-header')).toBeVisible()
  await expect(page.locator('app-terms-modal')).toHaveCount(0)
  await page.screenshot({ path: 'screens/584-2.png' })
})
