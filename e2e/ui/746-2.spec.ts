import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// 768px: a width where the recipe book's columns no longer all fit their minimum widths, so some fall.
test.use({ viewport: { width: 768, height: 900 } })

test('746-2: recipe book at medium width keeps the name wide and the cost as its own cell', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/recipe-book')
  const name = page.locator('app-list-shell .c-list-row .col-name').first()
  await expect(name).toBeVisible()
  // The cell's own height includes its padding and the approval badge, so the width is what is checked here.
  const width = await name.evaluate((el) => el.getBoundingClientRect().width)
  expect(width).toBeGreaterThanOrEqual(180)
  await expect(page.locator('app-list-shell .table-header .cc-arrow--next')).toBeVisible()
  await expect(page.locator('app-list-shell .table-header .col-cost')).toBeVisible()
  await page.screenshot({ path: 'screens/746-2.png' })
})
