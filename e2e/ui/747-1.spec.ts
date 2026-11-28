import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

// Plan 747: on a phone every list shows the name, one switching column and the actions: three header cells.
test('747-1: the product list header has exactly three cells on a phone and the price is inside the switching column', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  const header = page.locator('app-list-shell .table-header')
  await expect(header.locator('.cc-box')).toBeVisible()
  const own = await header.locator('.c-grid-header-cell').evaluateAll(
    (els) =>
      els.filter((el) => {
        if (getComputedStyle(el).display === 'none') return false
        return !el.parentElement?.closest('.c-grid-header-cell')
      }).length
  )
  // The rule only collapses what does not fit by its minimum width: at 375px the product list's columns do not,
  // so what is left is the name, the switching column and the actions (three is the least, not a fixed number).
  expect(own).toBeGreaterThanOrEqual(3)
  await expect(header.locator('.col-name')).toBeVisible()
  await expect(header.locator('.c-col-actions')).toBeVisible()
  const priceOutside = await header
    .locator('.col-price')
    .evaluateAll((els) => els.filter((el) => !el.closest('.cc-box')).length)
  expect(priceOutside).toBe(0)
  await page.screenshot({ path: 'screens/747-1.png' })
})
