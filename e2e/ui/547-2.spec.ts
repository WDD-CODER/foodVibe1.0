import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('547-2: the header link opens /clients with the clients chip active', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'לקוחות והזמנות' }).first().click()
  await expect(page).toHaveURL(/\/clients/)
  await expect(page.locator('a.c-chip--tab.active', { hasText: 'לקוחות' })).toBeVisible()
  await page.screenshot({ path: 'screens/547-2.png' })
})
