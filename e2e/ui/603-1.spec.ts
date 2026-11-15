import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('603-1: inventory round button sits below the table card at the page end', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory')
  const area = page.locator('app-list-shell .table-area')
  await expect(area).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const fab = await page.locator('.fab-main').boundingBox()
  const box = await area.boundingBox()
  if (!fab || !box) throw new Error('missing boxes')
  expect(fab.y).toBeGreaterThanOrEqual(box.y + box.height)
  await page.screenshot({ path: 'screens/603-1.png' })
})
