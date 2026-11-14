import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('611-1: the pinned business-name cells stay on top at the inline end', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/platform')
  await page.waitForLoadState('networkidle')
  test.skip(
    !page.url().includes('/platform'),
    'QA user is not a platform admin — /platform redirected; run the [human] check as the platform admin'
  )
  const rows = page.locator('[data-testid="biz-row"]')
  test.skip((await rows.count()) === 0, 'No business rows on /platform')
  await page.locator('.platform-grid-scroll').evaluate((el) => {
    el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -el.scrollWidth : el.scrollWidth
  })
  const bad = await page.locator('[data-testid="biz-name"]').evaluateAll(
    (cells) =>
      cells.filter((cell) => {
        const r = cell.getBoundingClientRect()
        if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return false
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !hit || !cell.contains(hit) || !!hit.closest('[data-testid="fd-edit"]')
      }).length
  )
  expect(bad).toBe(0)
  await page.screenshot({ path: 'screens/611-1.png', fullPage: false })
})
