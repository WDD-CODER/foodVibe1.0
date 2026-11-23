import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const PLAN = {
  _id: 'qa-fp',
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'qaarea01', name: 'בפנים', order: 0, color: 0 },
    { key: 'qaarea02', name: 'בחוץ', order: 1, color: 1 }
  ],
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

test('699-3: hovering the bin of an area with tables shows why at once', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  await page.locator('[data-testid="room-area-remove"]').first().hover()
  await expect(page.locator('.c-tip').getByText('יש שולחנות באזור הזה')).toBeVisible({ timeout: 300 })
  await page.screenshot({ path: 'screens/699-3.png' })
})
