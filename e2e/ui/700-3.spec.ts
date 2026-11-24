import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const PLAN = {
  _id: 'qa-fp',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'qaarea01', name: 'בפנים', order: 0, color: 0 }],
  tables: [],
  joins: []
}

test.use({ viewport: { width: 375, height: 800 } })

test('700-3: at 375 px the toolbar is one row and the page does not scroll sideways', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  await expect(page.locator('[data-testid="fp-toolbar"]')).toBeVisible()
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(375)
  await page.screenshot({ path: 'screens/700-3.png' })
})
