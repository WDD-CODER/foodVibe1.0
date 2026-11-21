import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 654: at 375 px every row on the count page shows its product name, and no empty column header is shown.
test('654-1: names visible and no empty column at 375 px', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/inventory/count')
  const names = page.locator('[data-testid="stk-row"] .stock-count__name')
  await expect(names.first()).toBeVisible()
  const texts = await names.allTextContents()
  expect(texts.every((t) => t.trim().length > 0)).toBe(true)
  const slide = page.locator('.column-slide.c-grid-header-cell')
  if ((await slide.count()) > 0) {
    await expect(page.locator('[data-testid="stk-row"] .stock-count__base').first()).not.toHaveText('')
  }
  await page.screenshot({ path: 'screens/654-1.png' })
})
