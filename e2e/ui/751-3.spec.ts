import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

// Plan 747 round two: the warning triangles of the product list sit in one straight column, and every name starts
// at the same place whether or not its row has a triangle.
test('751-3: the product list warning triangles and the names line up', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/list')
  const cells = page.locator('.product-grid-row .col-name')
  await expect(cells.first()).toBeVisible()

  // Distance from the inline-start edge of the name cell (the right edge in RTL) to the same edge of the part.
  const offsets = (selector: string): Promise<number[]> =>
    cells.evaluateAll((els, sel) => {
      const out: number[] = []
      for (const cell of els) {
        const part = cell.querySelector(sel)
        if (!part) continue
        const c = cell.getBoundingClientRect()
        const p = part.getBoundingClientRect()
        if (c.bottom <= 0 || c.top >= window.innerHeight || p.width === 0) continue
        const rtl = getComputedStyle(cell).direction === 'rtl'
        out.push(rtl ? c.right - p.right : p.left - c.left)
      }
      return out
    }, selector)

  const names = await offsets('.name-text')
  expect(names.length).toBeGreaterThan(0)
  expect(Math.max(...names) - Math.min(...names)).toBeLessThanOrEqual(1)

  const triangles = await offsets('.row-status')
  if (triangles.length === 0) test.skip(true, 'no product with a warning is on the screen')
  expect(Math.max(...triangles) - Math.min(...triangles)).toBeLessThanOrEqual(1)
  // The triangle sits before the name, in its own slot.
  expect(Math.max(...triangles)).toBeLessThan(Math.min(...names))
  // Its colour is the orange-yellow of --border-warning (#f59e0b), whatever the status kind.
  const colours = await page.locator('.row-status').evaluateAll((els) => els.map((el) => getComputedStyle(el).color))
  expect(new Set(colours)).toEqual(new Set(['rgb(245, 158, 11)']))
  await page.screenshot({ path: 'screens/751-3.png' })
})
