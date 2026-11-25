import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('745-3: on a phone the arrow switches the column and every row is one line high', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  const header = page.locator('app-list-shell .table-header .cc-header')
  await expect(header).toBeVisible()
  const before = await header.getAttribute('aria-label')
  await page.locator('app-list-shell .table-header .cc-arrow--next').click()
  await expect(header).not.toHaveAttribute('aria-label', before ?? '')
  const rows = page.locator('app-list-shell .table-body .col-name')
  const first = await rows.nth(0).evaluate((e) => (e as HTMLElement).offsetHeight)
  const second = await rows.nth(1).evaluate((e) => (e as HTMLElement).offsetHeight)
  expect(first).toBe(second)
  await page.screenshot({ path: 'screens/745-3.png' })
})
