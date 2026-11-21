import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 656: at 375, 800 and 1280 px the main pages have no horizontal scroll and the main header is shown.
const pages = [
  { name: 'inventory', url: '/inventory' },
  { name: 'recipe-book', url: '/recipe-book' },
  { name: 'suppliers', url: '/suppliers' },
  { name: 'count', url: '/inventory/count' },
  { name: 'dashboard', url: '/dashboard' }
]
const widths = [375, 800, 1280]

for (const p of pages) {
  for (const width of widths) {
    test(`656-1: ${p.name} at ${width} px has no horizontal scroll`, async ({ page, context }) => {
      await signInQa(context)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(p.url)
      await expect(page.locator('app-header, app-page-header').first()).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await page.screenshot({ path: `screens/656-1-${p.name}-${width}.png` })
    })
  }
}
