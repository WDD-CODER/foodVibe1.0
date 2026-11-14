import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('603-2: inventory search, divider and table card are evenly spaced', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory')
  const header = page.locator('app-list-shell .list-header')
  const area = page.locator('app-list-shell .table-area')
  await expect(area).toBeVisible()
  const h = await header.boundingBox()
  const a = await area.boundingBox()
  const w = await page.locator('.list-header .c-input-wrapper').first().boundingBox()
  if (!h || !a || !w) throw new Error('missing boxes')
  const gap = a.y - (h.y + h.height)
  const inner = h.y + h.height - (w.y + w.height)
  expect(gap).toBeGreaterThanOrEqual(8)
  expect(gap).toBeLessThanOrEqual(20)
  expect(Math.abs(gap - inner)).toBeLessThanOrEqual(4)
  await page.screenshot({ path: 'screens/603-2.png' })
})
