import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('603-3: supplier column header reads between its arrows', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/suppliers')
  const header = page.locator('app-column-carousel-header').first()
  await expect(header).toBeVisible()
  const slide = header.locator('.column-slide--active')
  const s = await slide.boundingBox()
  const p = await header.locator('.cc-arrow--prev').boundingBox()
  const n = await header.locator('.cc-arrow--next').boundingBox()
  const d = await header.locator('.cc-dots').boundingBox()
  if (!s || !p || !n || !d) throw new Error('missing boxes')
  const hit = (b: { x: number; y: number; width: number; height: number }) =>
    s.x < b.x + b.width && b.x < s.x + s.width && s.y < b.y + b.height && b.y < s.y + s.height
  expect(hit(p)).toBe(false)
  expect(hit(n)).toBe(false)
  expect(await slide.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(d.y).toBeGreaterThanOrEqual(s.y + s.height + 2)
  await page.screenshot({ path: 'screens/603-3.png' })
})
