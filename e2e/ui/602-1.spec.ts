import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('602-1: /inventory/equipment/add', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/equipment/add')
  const el = page.locator('.equipment-form-container')
  await expect(el).toBeVisible()
  const b = (await el.boundingBox())!
  const left = b.x
  const right = 1366 - (b.x + b.width)
  expect(Math.abs(left - right)).toBeLessThanOrEqual(2)
  expect(Math.min(left, right)).toBeGreaterThanOrEqual(16)
  await page.screenshot({ path: 'screens/602-1.png' })
})
