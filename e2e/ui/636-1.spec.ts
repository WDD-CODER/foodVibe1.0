import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('636-1: the inventory chip "ספירת מלאי" opens the count screen with its title', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  await page.locator('a.c-chip--tab', { hasText: 'ספירת מלאי' }).click()
  await expect(page).toHaveURL(/\/inventory\/count$/)
  await expect(page.locator('app-stock-count').getByText('ספירת מלאי', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: 'screens/636-1.png' })
})
