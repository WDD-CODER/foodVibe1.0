import { test, expect } from '@playwright/test'

test('609-2: filter panel hugs its filters on /inventory/list', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/inventory/list')
  const panel = page.locator('.filter-panel')
  const content = page.locator('.filter-panel .panel-content')
  if (!(await content.isVisible())) {
    await page.getByRole('button', { name: /filter|סינון|מסננים/i }).first().click()
  }
  await expect(content).toBeVisible()
  const { h, sum } = await content.evaluate((el) => {
    const kids = Array.from(el.children) as HTMLElement[]
    return {
      h: el.getBoundingClientRect().height,
      sum: kids.reduce((s, k) => s + k.getBoundingClientRect().height, 0),
    }
  })
  expect(Math.abs(h - (sum + 24))).toBeLessThanOrEqual(2)
  await panel.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'screens/609-2.png', fullPage: false })
})
