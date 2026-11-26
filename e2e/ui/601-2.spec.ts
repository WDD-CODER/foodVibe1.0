import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('601-2: the last bookings chip is readable at the far end of the row', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/bookings')
  const scroller = page.locator('.c-tab-chips .sr-scroller')
  const frame = page.locator('.c-tab-chips .sr-frame')
  await expect(scroller).toBeVisible()
  await scroller.evaluate((el) => {
    el.scrollLeft = -el.scrollWidth
  })
  // Plan 747: at the far end the fade on that side is gone (there are no arrow buttons on a phone).
  await expect(frame).not.toHaveClass(/has-next/)
  const chip = await page.locator('.c-tab-chips a[href="/frontdesk/knowledge"]').boundingBox()
  const s = await scroller.boundingBox()
  if (!chip || !s) throw new Error('missing box')
  expect(chip.x).toBeGreaterThanOrEqual(s.x - 0.5)
  expect(chip.x + chip.width).toBeLessThanOrEqual(s.x + s.width + 0.5)
  expect(chip.x).toBeGreaterThanOrEqual(0)
  expect(chip.x + chip.width).toBeLessThanOrEqual(375)
  await page.screenshot({ path: 'screens/601-2.png' })
})
