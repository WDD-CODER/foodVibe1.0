import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plans 743, 747: on a phone the rail has no arrow buttons at all (the edge fade is the sign), and the row still
// scrolls by swiping.
test('743-2: no arrow button exists on a phone and the settings tabs still scroll', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')

  const rail = page.locator('.settings-tabs app-scroll-rail')
  await expect(rail).toBeVisible()
  await expect(rail.locator('.sr-arrow')).toHaveCount(0)

  const scroller = rail.locator('.sr-scroller')
  const overflows = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 2)
  if (!overflows) test.skip(true, 'the settings tabs fit at 375 px')
  const before = await scroller.evaluate((el) => el.scrollLeft)
  await scroller.evaluate((el) => {
    el.scrollLeft = el.scrollLeft + (getComputedStyle(el).direction === 'rtl' ? -80 : 80)
  })
  expect(await scroller.evaluate((el) => el.scrollLeft)).not.toBe(before)
  await page.screenshot({ path: 'screens/743-2.png' })
})
