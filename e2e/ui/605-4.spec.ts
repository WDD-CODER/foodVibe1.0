import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('605-4: the day-load chart has a title, HH:00 hours and sits at the right edge', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/requests')
  const strip = page.locator('app-day-load-strip [data-testid="day-load"]').first()
  test.skip(!(await strip.isVisible({ timeout: 10000 }).catch(() => false)), 'No request with a day-load chart')
  await expect(strip.locator('.strip-title')).toHaveText('סועדים לפי שעה')
  for (const hour of await strip.locator('.strip-hour').allTextContents()) expect(hour.trim()).toMatch(/^\d{2}:00$/)
  const barsBox = (await strip.locator('.strip-bars').boundingBox())!
  const colBox = (await strip.locator('.strip-col').last().boundingBox())!
  expect(Math.abs(barsBox.x + barsBox.width - (colBox.x + colBox.width))).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/605-4.png' })
})
