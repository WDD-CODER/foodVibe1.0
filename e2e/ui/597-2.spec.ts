import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('597-2: the waiting badge sits on the clients icon, above the label', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/dashboard')
  const tab = page.locator('.bottom-nav a[href="/clients"]')
  await expect(tab).toBeVisible()
  const badge = tab.locator('.c-chip__count')
  test.skip((await badge.count()) === 0, 'No waiting request for the QA user: nothing to badge')
  const b = (await badge.boundingBox())!
  const icon = (await tab.locator('lucide-icon').boundingBox())!
  const label = (await tab.locator('.bottom-nav__label').boundingBox())!
  expect(b.x).toBeLessThan(icon.x + icon.width)
  expect(b.x + b.width).toBeGreaterThan(icon.x)
  expect(b.y).toBeLessThan(icon.y + icon.height)
  expect(b.y + b.height).toBeGreaterThan(icon.y)
  expect(b.y).toBeLessThan(label.y)
  await page.screenshot({ path: 'screens/597-2.png' })
})
