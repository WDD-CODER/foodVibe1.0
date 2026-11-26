import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 747: on a phone the price is one of the columns inside the switching column; the arrow brings it up.
test('599-2: inventory prices fit their cell on a phone', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/inventory/list')
  const prices = page.locator('.table-body .col-price-readonly')
  const next = page.locator('app-list-shell .table-header .cc-arrow--next')
  await expect(next).toBeVisible()
  for (let i = 0; i < 5 && (await prices.count()) === 0; i++) {
    await next.click()
    await page.waitForTimeout(250)
  }
  await expect(prices.first()).toBeVisible()
  const count = Math.min(await prices.count(), 8)
  for (let i = 0; i < count; i++) {
    const cell = prices.nth(i)
    const fits = await cell.evaluate((el) => el.scrollWidth <= el.clientWidth)
    expect(fits).toBe(true)
  }
  await page.screenshot({ path: 'screens/599-2.png' })
})
