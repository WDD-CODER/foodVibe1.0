import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('601-2: the last bookings chip is readable at the far end of the row', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/bookings')
  const scroller = page.locator('.c-tab-chips .sr-scroller')
  await expect(scroller).toBeVisible()
  await scroller.evaluate((el) => {
    el.scrollLeft = -el.scrollWidth
  })
  await expect(page.locator('.c-tab-chips .sr-arrow--next')).toHaveClass(/is-hidden/)
  const chip = await page.locator('.c-tab-chips a[href="/frontdesk/knowledge"]').boundingBox()
  const s = await scroller.boundingBox()
  const prev = await page.locator('.c-tab-chips .sr-arrow--prev').boundingBox()
  if (!chip || !s || !prev) throw new Error('missing box')
  expect(chip.x).toBeGreaterThanOrEqual(s.x - 0.5)
  expect(chip.x + chip.width).toBeLessThanOrEqual(s.x + s.width + 0.5)
  expect(chip.x).toBeGreaterThanOrEqual(0)
  expect(chip.x + chip.width).toBeLessThanOrEqual(375)
  expect(chip.x < prev.x + prev.width && chip.x + chip.width > prev.x).toBe(false)
  await page.screenshot({ path: 'screens/601-2.png' })
})
