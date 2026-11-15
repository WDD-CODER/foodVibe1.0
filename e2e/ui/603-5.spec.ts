import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('603-5: recipe builder last card ends above the round button and the stamp', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/recipe-builder')
  await expect(page.locator('.section-card').first()).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const b = await page.locator('.section-card').last().boundingBox()
  const fab = await page.locator('.fab-main').boundingBox()
  const stamp = await page.locator('.approve-stamp').boundingBox()
  if (!b || !fab || !stamp) throw new Error('missing boxes')
  expect(b.y + b.height).toBeLessThanOrEqual(fab.y)
  expect(b.y + b.height).toBeLessThanOrEqual(stamp.y)
  await page.screenshot({ path: 'screens/603-5.png' })
})
