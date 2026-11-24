import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const table = (key: string, number: string, x: number) => ({
  key,
  number,
  areaKey: 'qaarea01',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
})

const PLAN = {
  _id: 'qa-fp',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'qaarea01', name: 'בפנים', order: 0, color: 0 }],
  tables: [table('qatable5', '5', 0), table('qatable6', '6', 4), table('qatable7', '7', 10)],
  joins: [{ key: 'qajoin01', tableKeys: ['qatable5', 'qatable6'], minSeats: 2, maxSeats: 8, online: true }]
}

test('699-1: joined tables 5 and 6 are marked, table 7 is not', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  await expect(page.locator('[data-testid="floor-table-5"]')).toHaveClass(/is-joined/)
  await expect(page.locator('[data-testid="floor-table-6"]')).toHaveClass(/is-joined/)
  await expect(page.locator('[data-testid="floor-table-7"]')).not.toHaveClass(/is-joined/)
  await page.screenshot({ path: 'screens/699-1.png' })
})
