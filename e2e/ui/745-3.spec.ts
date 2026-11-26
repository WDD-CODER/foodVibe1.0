import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

// Plan 747: long supplier lists are cut to one line, so a row stays one line while the switching column shows
// any of its columns.
test('745-3: on a phone the arrow switches the column and every row is one line high', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  const header = page.locator('app-list-shell .table-header .cc-header')
  await expect(header).toBeVisible()
  const rows = page.locator('app-list-shell .table-body .col-name')
  const next = page.locator('app-list-shell .table-header .cc-arrow--next')
  const seen = new Set<string>()
  for (let i = 0; i < 6; i++) {
    const label = (await header.getAttribute('aria-label')) ?? ''
    if (seen.has(label)) break
    seen.add(label)
    const count = Math.min(await rows.count(), 12)
    for (let r = 0; r < count; r++) {
      expect(await rows.nth(r).evaluate((e) => (e as HTMLElement).offsetHeight)).toBeLessThanOrEqual(80)
    }
    await next.click()
    await expect(header).not.toHaveAttribute('aria-label', label)
  }
  expect(seen.size).toBeGreaterThan(1)
  await page.screenshot({ path: 'screens/745-3.png' })
})
