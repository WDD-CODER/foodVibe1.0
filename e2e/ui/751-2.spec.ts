import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

// Plan 747 round two: on a phone the row has no arrow buttons; a small arrow inside the container, on the side that
// has more, is the sign, and it goes away at the end.
test('751-2: the settings tabs show a sign of more inside the container on a phone', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')

  const rail = page.locator('.settings-tabs app-scroll-rail')
  await expect(rail).toBeVisible()
  const scroller = rail.locator('.sr-scroller')
  const overflows = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 2)
  if (!overflows) test.skip(true, 'the settings tabs fit at 375 px')

  await expect(rail.locator('.sr-arrow')).toHaveCount(0)
  const next = rail.locator('.sr-frame .sr-more--next')
  const prev = rail.locator('.sr-frame .sr-more--prev')
  await expect(next).toBeVisible()
  await expect(prev).toBeHidden()
  await expect(next).toHaveAttribute('aria-hidden', 'true')
  await page.screenshot({ path: 'screens/751-2.png' })

  // To the end of the row (toward the inline end: negative scrollLeft in RTL).
  await scroller.evaluate((el) => {
    const max = el.scrollWidth - el.clientWidth
    el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -max : max
  })
  await expect(next).toBeHidden()
  await expect(prev).toBeVisible()
})
