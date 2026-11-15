import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('601-1: the dashboard chip row keeps its arrow beside the chips', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard')
  const arrow = page.locator('.c-tab-chips .sr-arrow--next')
  const scroller = page.locator('.c-tab-chips .sr-scroller')
  await expect(arrow).toBeVisible()
  const a = await arrow.boundingBox()
  const s = await scroller.boundingBox()
  if (!a || !s) throw new Error('missing box')
  const overlap = a.x < s.x + s.width && a.x + a.width > s.x
  expect(overlap).toBe(false)
  for (const b of [a, s]) {
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(375)
  }
  await page.screenshot({ path: 'screens/601-1.png' })
})
