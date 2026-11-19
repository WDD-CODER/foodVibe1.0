import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('644-1: the history panel is a bordered box and the dialog keeps its size', async ({ page, context }) => {
  await signInQa(context)
  const rows = Array.from({ length: 12 }, (_, i) => ({
    at: 1760000000000 - i * 3600000,
    by: 'u1',
    byName: 'דנה',
    reason: `סיבה ${i}`,
    changed: ['modules']
  }))
  await page.route('**/admin/businesses/*/platform-history', (route) => route.fulfill({ json: { rows } }))
  await page.goto('/platform')
  await page.locator('[data-testid="biz-edit"]').first().click({ force: true })
  const card = page.locator('.c-modal-card')
  await expect(page.locator('[data-testid="biz-dialog"]')).toBeVisible()
  const before = await card.boundingBox()
  await page.locator('[data-testid="biz-history-open"]').click()
  const panel = page.locator('[data-testid="biz-history"]')
  await expect(panel).toBeVisible()
  const after = await card.boundingBox()
  expect(after?.width).toBe(before?.width)
  expect(after?.height).toBe(before?.height)
  await expect(panel).toHaveCSS('border-top-style', 'solid')
  await expect(panel).toHaveCSS('border-top-width', '1px')
  const scrolls = await page
    .locator('[data-testid="biz-dialog"]')
    .evaluate((n) => getComputedStyle(n).overflowY === 'auto' && n.scrollHeight > n.clientHeight)
  expect(scrolls).toBe(true)
  await page.screenshot({ path: 'screens/644-1.png' })
})
