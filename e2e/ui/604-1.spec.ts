import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('604-1: the category label icon is small', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/add')
  const svg = page.locator('.form-section--mandatory .product-field > label lucide-icon svg').first()
  await expect(svg).toBeVisible()
  const box = await svg.boundingBox()
  expect(box!.width).toBeLessThanOrEqual(16)
  expect(box!.height).toBeLessThanOrEqual(16)
  await page.screenshot({ path: 'screens/604-1.png' })
})
