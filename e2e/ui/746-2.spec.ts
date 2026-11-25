import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1000, height: 800 } })

test('746-2: recipe book at medium width keeps the name wide and the cost as its own cell', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/recipe-book')
  const name = page.locator('app-list-shell .c-list-row .col-name').first()
  await expect(name).toBeVisible()
  const { width, lines } = await name.evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20
    return { width: el.getBoundingClientRect().width, lines: (el as HTMLElement).offsetHeight / lineHeight }
  })
  expect(width).toBeGreaterThanOrEqual(180)
  expect(lines).toBeLessThanOrEqual(2.2)
  await expect(page.locator('app-list-shell .table-header .col-cost')).toBeVisible()
  await page.screenshot({ path: 'screens/746-2.png' })
})
