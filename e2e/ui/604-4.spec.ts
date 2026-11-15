import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('604-4: the slug hint wraps in balanced lines', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/frontdesk/settings')
  const slug = page.locator('#fd-new-slug')
  test.skip((await slug.count()) === 0, 'the QA business already has a front-desk profile (no type picker)')
  const hint = page.locator('app-form-field', { has: slug }).locator('.form-field__hint')
  await expect(hint).toBeVisible()
  const widths = await hint.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0)
    const lines = new Map<number, { l: number; r: number }>()
    for (const r of rects) {
      const k = Math.round(r.top)
      const cur = lines.get(k)
      lines.set(k, cur ? { l: Math.min(cur.l, r.left), r: Math.max(cur.r, r.right) } : { l: r.left, r: r.right })
    }
    return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v.r - v.l)
  })
  expect(widths.length).toBeLessThanOrEqual(2)
  if (widths.length === 2) expect(widths[1]).toBeGreaterThanOrEqual(widths[0] * 0.4)
  await page.screenshot({ path: 'screens/604-4.png' })
})
