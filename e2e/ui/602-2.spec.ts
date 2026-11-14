import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('602-2: /requests', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/requests')
  const rq = page.locator('.rq-page')
  await expect(rq).toBeVisible()
  const b = (await rq.boundingBox())!
  expect(b.width).toBeLessThanOrEqual(960)
  expect(Math.abs(b.x - (1366 - b.x - b.width))).toBeLessThanOrEqual(2)
  const hb = (await page.locator('app-page-header').first().boundingBox())!
  const lb = (await page.locator('.rq-list').first().boundingBox())!
  expect(Math.abs(hb.x + hb.width - (lb.x + lb.width))).toBeLessThanOrEqual(2)
  const cards = page.locator('app-request-card')
  const count = await cards.count()
  if (count < 2) {
    await page.screenshot({ path: 'screens/602-2.png' })
    test.skip(true, 'fewer than two request cards: the row check needs at least two')
    return
  }
  const c1 = (await cards.nth(0).boundingBox())!
  const c2 = (await cards.nth(1).boundingBox())!
  expect(Math.abs(c1.y - c2.y)).toBeLessThanOrEqual(2)
  const minX = Math.min(c1.x, c2.x)
  const maxX = Math.max(c1.x + c1.width, c2.x + c2.width)
  expect(Math.abs(minX - lb.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(maxX - (lb.x + lb.width))).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/602-2.png' })
})
