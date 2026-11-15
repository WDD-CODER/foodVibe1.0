import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

for (const vp of [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
]) {
  test(`608-1: the amount stays visible at ${vp.width}x${vp.height}`, async ({ page, context }) => {
    await signInQa(context)
    await page.setViewportSize(vp)
    await page.goto('/recipe-builder')
    const row = page.locator('.ingredient-grid-row').first()
    await expect(row).toBeVisible()
    const input = (await row.locator('.qty-input').first().boundingBox())!
    expect(input.width).toBeGreaterThanOrEqual(44)
    for (const b of await row.locator('.qty-btn').all()) {
      expect((await b.boundingBox())!.width).toBeGreaterThanOrEqual(32)
    }
    await page.screenshot({ path: 'screens/608-1.png' })
  })
}
