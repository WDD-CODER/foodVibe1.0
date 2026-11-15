import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('603-4: dashboard last button ends above the round button and the bottom bar', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard')
  await expect(page.locator('.dashboard-content')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const b = await page.locator('.dashboard-content button:visible').last().boundingBox()
  const fab = await page.locator('.fab-main').boundingBox()
  const nav = await page.locator('.bottom-nav').boundingBox()
  if (!b || !fab || !nav) throw new Error('missing boxes')
  expect(b.y + b.height).toBeLessThanOrEqual(fab.y)
  expect(b.y + b.height).toBeLessThanOrEqual(nav.y)
  await page.screenshot({ path: 'screens/603-4.png' })
})
