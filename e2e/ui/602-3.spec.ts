import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('602-3: /menu-library', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/menu-library')
  const el = page.locator('.menu-library-container')
  await expect(el).toBeVisible()
  const b = (await el.boundingBox())!
  expect(b.width).toBeGreaterThanOrEqual(1150)
  expect(Math.abs(b.x - (1366 - b.x - b.width))).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/602-3.png' })
})
