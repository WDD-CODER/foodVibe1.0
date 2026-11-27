import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 743: the top bar at tablet width is the sideways row container — no scrollbar of its own, an arrow that moves it.
test('743-1: the top bar rail has no scrollbar and its next arrow moves the row', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 900, height: 800 })
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  const rail = page.locator('app-scroll-rail.nav-pills')
  await expect(rail).toBeVisible()
  const scroller = rail.locator('.sr-scroller')
  expect(await scroller.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe('none')

  const overflows = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 2)
  if (!overflows) test.skip(true, 'the top bar fits at 900 px with these links')

  const next = rail.locator('.sr-arrow--next')
  await expect(next).toBeVisible()
  // Plan 747: the arrow sits beside the container, never over the links inside it.
  const arrowBox = await next.boundingBox()
  const frameBox = await rail.locator('.sr-frame').boundingBox()
  if (!arrowBox || !frameBox) throw new Error('missing boxes')
  const overlap =
    arrowBox.x < frameBox.x + frameBox.width &&
    frameBox.x < arrowBox.x + arrowBox.width &&
    arrowBox.y < frameBox.y + frameBox.height &&
    frameBox.y < arrowBox.y + arrowBox.height
  expect(overlap).toBe(false)
  await page.screenshot({ path: 'screens/743-1.png' })
  const before = await scroller.evaluate((el) => el.scrollLeft)
  await next.click()
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).not.toBe(before)
})
