import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('604-2: the option tiles are even', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/add')
  const section = page.locator('.form-section--optional')
  const headers = section.locator('.collapsible-field__header')
  await expect(headers).toHaveCount(5)
  const boxes = await headers.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect()
      const i = e.querySelector('lucide-icon')!.getBoundingClientRect()
      return { w: r.width, h: r.height, cy: r.top + r.height / 2, icy: i.top + i.height / 2 }
    })
  )
  const sec = await section.evaluate((e) => {
    const cs = getComputedStyle(e)
    return e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  })
  for (const b of boxes) {
    expect(Math.abs(b.h - boxes[0].h)).toBeLessThanOrEqual(1)
    expect(Math.abs(b.icy - b.cy)).toBeLessThanOrEqual(2)
  }
  expect(Math.abs(boxes[4].w - sec)).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/604-2.png' })
})
