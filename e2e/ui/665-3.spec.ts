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

test('665-3: dragging table 1 four cells toward the inline end sets data-x to 4', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  const table = page.locator('[data-testid="floor-table-1"]')
  await expect(table).toBeVisible()
  const grid = await page.locator('[data-testid="floor-grid"]').boundingBox()
  const box = await table.boundingBox()
  if (!grid || !box) throw new Error('map not drawn')
  const cell = grid.width / 24
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  // Steps, so the drag threshold is passed. In RTL the inline end is the left side.
  for (let i = 1; i <= 8; i++) await page.mouse.move(startX - (cell * 4 * i) / 8, startY)
  await page.mouse.up()
  await expect(table).toHaveAttribute('data-x', '4')
  await page.screenshot({ path: 'screens/665-3.png' })
})
