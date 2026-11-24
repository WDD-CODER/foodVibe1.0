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
      x: 14,
      y: 10,
      w: 3,
      h: 3,
      turned: false,
      active: true,
      online: true
    }
  ],
  joins: []
}

test('700-1: drawing the zone "בחוץ" from cell (2,2) to (8,6) shows it on the map', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  await page.locator('[data-testid="fp-legend-qaarea02"]').click()
  await page.getByRole('button', { name: 'סימון על המפה' }).click()
  const box = await page.locator('[data-testid="floor-grid"]').boundingBox()
  if (!box) throw new Error('no grid')
  const cell = box.width / PLAN.grid.cols
  // The room is right-to-left: column 0 is the rightmost one.
  const at = (cx: number, cy: number) => ({ x: box.x + box.width - (cx + 0.5) * cell, y: box.y + (cy + 0.5) * cell })
  const from = at(2, 2)
  const to = at(8, 6)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
  await expect(page.locator('[data-testid^="floor-zone-"]').filter({ hasText: 'בחוץ' })).toBeVisible()
  await page.screenshot({ path: 'screens/700-1.png' })
})
