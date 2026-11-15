import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('604-3: the ingredient card is evenly spaced', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/recipe-builder')
  const row = page.locator('.ingredient-grid-row').first()
  await expect(row).toBeVisible()
  const box = async (sel: string) => (await row.locator(sel).first().boundingBox())!
  const qty = await box('.quantity-controls')
  const unit = await box('.col-unit app-custom-select')
  const cost = await box('.cost-value')
  const trash = await box('.col-actions .c-icon-btn')
  const btn = await box('.qty-btn')
  // RTL: the unit sits to the left of the quantity, the cost to the left of the unit.
  const gap1 = Math.min(Math.abs(qty.x - (unit.x + unit.width)), Math.abs(unit.x - (qty.x + qty.width)))
  const gap2 = Math.min(Math.abs(unit.x - (cost.x + cost.width)), Math.abs(cost.x - (unit.x + unit.width)))
  expect(gap1).toBeGreaterThanOrEqual(8)
  expect(gap2).toBeGreaterThanOrEqual(8)
  expect(btn.width).toBeGreaterThanOrEqual(32)
  expect(Math.abs(cost.x - trash.x)).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/604-3.png' })
})
