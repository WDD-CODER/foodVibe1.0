import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('605-1: the menu library filters share one even grid', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/menu-library')
  const bar = page.locator('.filters-bar')
  test.skip(!(await bar.isVisible({ timeout: 10000 }).catch(() => false)), 'No events for the QA business: filters bar absent')
  const boxes = await page.locator('.filters-bar > .filter-item').evaluateAll(els =>
    els.map(e => {
      const r = e.getBoundingClientRect()
      return { top: r.top, width: r.width, right: r.right }
    })
  )
  expect(boxes.length).toBe(5)
  for (const b of boxes) expect(Math.abs(b.top - boxes[0].top)).toBeLessThanOrEqual(1)
  for (const b of boxes.slice(0, 4)) expect(Math.abs(b.width - boxes[0].width)).toBeLessThanOrEqual(1)
  const barEdge = await bar.evaluate(el => {
    const cs = getComputedStyle(el)
    return el.getBoundingClientRect().right - parseFloat(cs.paddingInlineEnd)
  })
  expect(Math.abs(boxes[0].right - barEdge)).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/605-1.png' })
})
