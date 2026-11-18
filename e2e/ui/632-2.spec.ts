import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('632-2: with nothing to switch to the header shows the business name, no banner and no switcher', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/dashboard')
  await expect(page.locator('.user-chip .business-name')).toBeVisible()
  await expect(page.locator('[data-testid="acting-banner"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="business-switcher"]')).toHaveCount(0)
  await page.screenshot({ path: 'screens/632-2.png' })
})
