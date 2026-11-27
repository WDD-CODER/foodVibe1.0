import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

// Plan 747: on a phone the row has no arrow buttons; the soft fade at the edge shows that there is more.
test('601-1: the dashboard chip row shows more to the side by its fade, with no arrow button', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/dashboard')
  const frame = page.locator('.c-tab-chips .sr-frame')
  await expect(frame).toBeVisible()
  await expect(page.locator('.c-tab-chips .sr-arrow')).toHaveCount(0)
  await expect(frame).toHaveClass(/has-next/)
  const s = await frame.boundingBox()
  if (!s) throw new Error('missing box')
  expect(s.x).toBeGreaterThanOrEqual(0)
  expect(s.x + s.width).toBeLessThanOrEqual(375)
  await page.screenshot({ path: 'screens/601-1.png' })
})
