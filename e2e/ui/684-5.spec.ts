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

test('684-5: a save refused with 409 TABLE_IN_USE shows the notice', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => {
    if (route.request().method() === 'PUT') {
      return route.fulfill({
        status: 409,
        json: {
          error: 'TABLE_IN_USE',
          bookings: [{ _id: 'qb1', date: '2030-01-01', time: '19:00', partySize: 2, tableKeys: ['qatable1'] }]
        }
      })
    }
    return route.fulfill({ json: { plan: PLAN } })
  })

  await page.goto('/frontdesk/floor-plan')
  await page.locator('[data-testid="floor-table-1"]').click()
  await page.getByRole('button', { name: 'הסרת השולחן' }).click()
  await page.getByRole('button', { name: 'שמור' }).click()
  await expect(page.getByText('אי אפשר להסיר שולחנות שיש להם הזמנות')).toBeVisible()
  await page.screenshot({ path: 'screens/684-5.png' })
})
