import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('611-2: on a phone the grid has no sideways scroll and the carousel swaps the column', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/platform')
  await page.waitForLoadState('networkidle')
  test.skip(
    !page.url().includes('/platform'),
    'QA user is not a platform admin — /platform redirected; run the [human] check as the platform admin'
  )
  const rows = page.locator('[data-testid="biz-row"]')
  test.skip((await rows.count()) === 0, 'No business rows on /platform')
  const scroll = page.locator('.platform-grid-scroll')
  const fits = await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
  expect(fits).toBe(true)
  const header = page.locator('.platform-grid app-column-carousel-header .cc-header')
  const before = await header.getAttribute('aria-label')
  await page.locator('.platform-grid app-column-carousel-header .cc-arrow--next').click()
  await expect(header).not.toHaveAttribute('aria-label', before ?? '')
  const after = await header.getAttribute('aria-label')
  await expect(rows.first().locator('.cc-cell-label-text')).toHaveText(after ?? '')
  await page.screenshot({ path: 'screens/611-2.png', fullPage: false })
})
