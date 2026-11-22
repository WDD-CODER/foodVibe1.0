import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const PLAN = {
  _id: 'qa-fp',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'qaarea01', name: 'בפנים', order: 0 }],
  tables: [
    {
      key: 'qatable1',
      number: '1',
      areaKey: 'qaarea01',
      shape: 'square',
      minSeats: 2,
      maxSeats: 4,
      x: 0,
      y: 0,
      w: 3,
      h: 3,
      turned: false,
      active: true,
      online: true
    }
  ],
  joins: []
}

test('666-3: at 375 px the down arrow moves table 1 to y 1', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  await page.locator('[data-testid="floor-table-1"]').click()
  await page.getByRole('button', { name: 'הזזה למטה' }).click()
  await expect(page.locator('[data-testid="floor-table-1"]')).toHaveAttribute('data-y', '1')
  await page.screenshot({ path: 'screens/666-3.png' })
})
