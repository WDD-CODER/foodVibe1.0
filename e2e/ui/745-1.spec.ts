import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1600, height: 900 } })

test('745-1: wide list shows every column and no carousel arrow', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  const toggle = page.locator('app-list-shell .open-panel-btn')
  await expect(toggle).toBeVisible()
  if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click()
  const header = page.locator('app-list-shell .table-header')
  for (const col of ['col-category', 'col-allergens', 'col-supplier', 'col-unit']) {
    await expect(header.locator(`.${col}`)).toBeVisible()
  }
  await expect(header.locator('.cc-arrow')).toHaveCount(0)
  await page.screenshot({ path: 'screens/745-1.png' })
})
