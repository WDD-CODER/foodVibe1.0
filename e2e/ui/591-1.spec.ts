import { test, expect } from '@playwright/test'

test('591-1: sign-out from /recipe-book lands on /welcome', async ({ page }) => {
  await page.goto('/recipe-book')
  await page.locator('button.auth-username-btn').first().click()
  await expect(page).toHaveURL(/\/welcome/)
  await page.screenshot({ path: 'screens/591-1.png', fullPage: false })
})
