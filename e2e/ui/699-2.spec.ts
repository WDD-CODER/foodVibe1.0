import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const PLAN = {
  _id: 'qa-fp',
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'qaarea01', name: 'בפנים', order: 0, color: 0 },
    { key: 'qaarea02', name: 'בחוץ', order: 1, color: 1, zone: { x: 1, y: 1, w: 8, h: 6 } }
  ],
  tables: [
    {
      key: 'qatable1',
      number: '1',
      areaKey: 'qaarea02',
      shape: 'square',
      minSeats: 2,
      maxSeats: 4,
      x: 2,
      y: 2,
      w: 3,
      h: 3,
      turned: false,
      active: true,
      online: true
    }
  ],
  joins: []
}

test('699-2: the zone of "בחוץ" is drawn on the map with its name', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  const zone = page.locator('[data-testid="floor-zone-qaarea02"]')
  await expect(zone).toBeVisible()
  await expect(zone).toContainText('בחוץ')
  await page.screenshot({ path: 'screens/699-2.png' })
})
