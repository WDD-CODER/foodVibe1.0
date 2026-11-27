import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

// Plan 747: the row's arrows sit beside the container, never over its chips.
test('747-3: the catalog row arrows do not overlap the container', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dev/catalog')
  const rail = page.locator('#sideways-row app-scroll-rail')
  await expect(rail).toBeVisible()
  const frame = await rail.locator('.sr-frame').boundingBox()
  const arrow = rail.locator('.sr-arrow:not(.is-hidden)').first()
  await expect(arrow).toBeVisible()
  const box = await arrow.boundingBox()
  if (!frame || !box) throw new Error('missing boxes')
  const overlap =
    box.x < frame.x + frame.width && frame.x < box.x + box.width && box.y < frame.y + frame.height && frame.y < box.y + box.height
  expect(overlap).toBe(false)
  await page.screenshot({ path: 'screens/747-3.png' })
})
