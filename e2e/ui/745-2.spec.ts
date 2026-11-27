import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// 800px: a width where the product list's columns no longer all fit their minimum widths, so some fall.
test.use({ viewport: { width: 800, height: 900 } })

test('745-2: a narrower list drops columns into the switching column, name stays wide, no sideways scroll', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  const header = page.locator('app-list-shell .table-header')
  await expect(header.locator('.cc-arrow--next')).toBeVisible()
  const separate = await header
    .locator('.col-category, .col-allergens, .col-supplier, .col-unit')
    .evaluateAll((els) => els.filter((e) => !e.closest('.cc-box')).length)
  expect(separate).toBeLessThanOrEqual(2)
  const name = page.locator('app-list-shell .table-body .col-name').first()
  await expect(name).toBeVisible()
  const box = await name.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(180)
  const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  expect(noScroll).toBe(true)
  await page.screenshot({ path: 'screens/745-2.png' })
})
