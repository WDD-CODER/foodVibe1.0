import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// Plan 657: at 375 px a tap on a row's base-amount control opens the light popup (page behind sharp), a scroll closes
// it; at 375, 800 and 1280 px the counted checkbox has three different sizes.
test('657-1: the base amount opens lightly on a phone and a scroll closes it', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/inventory/count')
  await page.waitForLoadState('networkidle')

  const control = page.locator('[data-testid="stk-base-btn"]').first()
  if ((await control.count()) === 0) test.skip(true, 'no row with a base amount in this data')
  await control.click()
  // Plan 747: the hint is the shared tooltip; a tap shows it and a scroll hides it.
  const light = page.locator('.c-tooltip')
  await expect(light).toBeVisible()
  await page.screenshot({ path: 'screens/657-1-light-375.png' })

  await page.mouse.wheel(0, 300)
  await expect(light).toBeHidden()
})

test('657-1: the counted checkbox has three different sizes at 375, 800 and 1280 px', async ({ page, context }) => {
  await signInQa(context)
  const sizes: number[] = []
  for (const width of [375, 800, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/inventory/count')
    await page.waitForLoadState('networkidle')
    const cell = page.locator('.stock-count__counted').first()
    await expect(cell).toBeVisible()
    sizes.push(parseFloat(await cell.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--stock-count-mark-size'))))
    await page.screenshot({ path: `screens/657-1-mark-${width}.png` })
  }
  expect(new Set(sizes).size).toBe(3)
  expect(sizes[2]).toBeGreaterThan(sizes[1])
  expect(sizes[1]).toBeGreaterThan(sizes[0])
})
