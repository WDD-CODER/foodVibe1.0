import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 656: one breakpoint set (phone ≤767, tablet ≤1023, desktop ≥1024). At 375, 800 and 1280 px each main page
// renders without a horizontal scroll and every list row stays on one line; one screenshot per page and width.
const WIDTHS = [375, 800, 1280]
const PAGES = [
  { name: 'inventory', url: '/inventory/list' },
  { name: 'recipe-book', url: '/recipe-book' },
  { name: 'suppliers', url: '/suppliers/list' },
  { name: 'stock-count', url: '/inventory/count' },
  { name: 'dashboard', url: '/dashboard' },
]

for (const width of WIDTHS) {
  for (const p of PAGES) {
    test(`656-1: ${p.name} at ${width} px — no horizontal scroll, rows on one line`, async ({ page, context }) => {
      await signInQa(context)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(p.url)
      await page.waitForLoadState('networkidle')

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)

      // A list row is one line: none of its direct cells sits below the row's first cell.
      const wrapped = await page.locator('.c-list-row').evaluateAll((rows) =>
        rows.slice(0, 20).filter((row) => {
          const cells = [...row.children].filter((c) => (c as HTMLElement).offsetParent !== null) as HTMLElement[]
          if (cells.length < 2) return false
          const top = cells[0].getBoundingClientRect().top
          return cells.some((c) => c.getBoundingClientRect().top - top > c.getBoundingClientRect().height)
        }).length,
      )
      expect(wrapped).toBe(0)

      // The main header: the top bar from tablet up, the bottom tab bar on a phone.
      const chrome = width <= 767 ? page.locator('app-header .bottom-nav') : page.locator('app-header .header-nav')
      await expect(chrome).toBeVisible()

      await page.screenshot({ path: `screens/656-1-${p.name}-${width}.png`, fullPage: false })
    })
  }
}
