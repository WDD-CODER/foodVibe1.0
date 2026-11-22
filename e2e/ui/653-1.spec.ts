import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 653: at 375, 740 and 1280 px every row on the count page has its name, amount, unit and counted cells on one line.
test('653-1: count rows stay whole at 375, 740 and 1280 px', async ({ page, context }) => {
  await signInQa(context)
  for (const width of [375, 740, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/inventory/count')
    const row = page.locator('[data-testid="stk-row"]').first()
    await expect(row).toBeVisible()
    const tops = await row
      .locator('.stock-count__name, app-counter, app-custom-select, .stock-count__counted')
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)))
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(24)
  }
  await page.screenshot({ path: 'screens/653-1.png' })
})
