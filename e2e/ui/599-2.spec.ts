import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('599-2: inventory prices fit their cell on a phone', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/inventory/list')
  const prices = page.locator('.col-price-readonly')
  await expect(prices.first()).toBeVisible()
  const count = Math.min(await prices.count(), 8)
  for (let i = 0; i < count; i++) {
    const cell = prices.nth(i)
    const fits = await cell.evaluate((el) => el.scrollWidth <= el.clientWidth)
    expect(fits).toBe(true)
    const box = await cell.boundingBox()
    const prev = await cell.locator('xpath=preceding-sibling::*[1]').boundingBox()
    if (box && prev) {
      const overlap = box.x < prev.x + prev.width - 1 && prev.x < box.x + box.width - 1
      expect(overlap).toBe(false)
    }
  }
  await page.screenshot({ path: 'screens/599-2.png' })
})
