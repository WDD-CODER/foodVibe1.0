import { test, expect } from '@playwright/test'

test('535-1: /dev/catalog shows the search-combobox section', async ({ page }) => {
  await page.goto('/dev/catalog')
  const section = page.locator('section', { has: page.locator('h2', { hasText: /^search-combobox$/ }) })
  await expect(section.locator('h2')).toHaveText('search-combobox')
  await expect(section.locator('app-search-combobox').first()).toBeVisible()
  await page.screenshot({ path: 'screens/535-1.png', fullPage: false })
})
