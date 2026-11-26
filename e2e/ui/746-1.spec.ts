import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// 800px: a width where the supplier list's columns no longer all fit their minimum widths, so some fall.
test.use({ viewport: { width: 800, height: 900 } })

test('746-1: suppliers at medium width keep the phone as its own cell and the arrow shows', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/suppliers/list')
  const header = page.locator('app-list-shell .table-header')
  await expect(header.locator('.cc-arrow--next')).toBeVisible()
  await expect(header.locator('.col-phone')).toBeVisible()
  const noSideScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(noSideScroll).toBe(true)
  await page.screenshot({ path: 'screens/746-1.png' })
})
