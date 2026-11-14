import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('605-2: the sort button stays on one line and the date has the select outline', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/menu-library')
  test.skip(
    !(await page.locator('.filters-bar').isVisible({ timeout: 10000 }).catch(() => false)),
    'No events for the QA business: filters bar absent'
  )
  const tops = await page.locator('.sort-order-btn').evaluate(btn => {
    const range = document.createRange()
    range.selectNodeContents(btn)
    return Array.from(new Set(Array.from(range.getClientRects()).map(r => Math.round(r.top))))
  })
  expect(tops.length).toBe(1)
  const dateColor = await page.locator('#menu-library-date-from').evaluate(el => getComputedStyle(el).borderTopColor)
  const selectColor = await page
    .locator('.filters-bar .custom-select-trigger')
    .first()
    .evaluate(el => getComputedStyle(el).borderTopColor)
  expect(dateColor).toBe(selectColor)
  expect(dateColor).not.toBe('rgba(0, 0, 0, 0)')
  await page.screenshot({ path: 'screens/605-2.png' })
})
