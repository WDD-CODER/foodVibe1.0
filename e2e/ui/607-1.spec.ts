import { test, expect } from '@playwright/test'

test('607-1: phone bottom bar clients tab has no count badge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/dashboard')
  await expect(page.locator('.bottom-nav')).toBeVisible()
  await expect(page.locator('.bottom-nav .c-chip__count')).toHaveCount(0)
  await page.screenshot({ path: 'screens/607-1.png', fullPage: false })
})
