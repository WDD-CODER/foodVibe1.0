import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 900, height: 900 } })

// Plan 747: a cell is never narrower than its one-line content: the rating falls into the switching column before
// its stars are cut, so the decision follows the column's width, not a breakpoint.
test('747-2: no rating cell in the recipe book is narrower than its stars at 900px', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/recipe-book')
  await expect(page.locator('app-list-shell .table-body .c-list-row').first()).toBeVisible()
  const broken = await page.locator('app-list-shell .table-body .col-rating').evaluateAll(
    (els) =>
      els.filter((el) => {
        if (el.closest('.cc-box')) return false
        return el.scrollWidth > el.clientWidth + 1
      }).length
  )
  expect(broken).toBe(0)
  await page.screenshot({ path: 'screens/747-2.png' })
})
