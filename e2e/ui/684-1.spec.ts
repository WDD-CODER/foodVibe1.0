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

test('684-1: typing 12 in the number field renames table 1 on the map', async ({ page, context }) => {
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
  await page.getByLabel('מספר שולחן').fill('12')
  await expect(page.locator('[data-testid="floor-table-12"]')).toBeVisible()
  await page.screenshot({ path: 'screens/684-1.png' })
})
