import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('599-1: product form price and base unit line up on desktop', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/inventory/add')
  const section = page.locator('.form-section--mandatory').first()
  await expect(section).toBeVisible()
  const name = await section.locator('app-form-field').nth(0).boundingBox()
  const price = await section.locator('app-form-field', { has: page.locator('input[formControlName="buy_price_global_"]') }).boundingBox()
  const unit = await section.locator('app-form-field', { has: page.locator('app-custom-select[formControlName="baseUnit"]') }).boundingBox()
  expect(name && price && unit).toBeTruthy()
  expect(Math.abs(price!.y - unit!.y)).toBeLessThanOrEqual(4)
  expect(Math.abs(name!.width - price!.width)).toBeLessThanOrEqual(4)
  await page.screenshot({ path: 'screens/599-1.png' })
})
