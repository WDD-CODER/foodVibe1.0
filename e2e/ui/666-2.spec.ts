import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const T = (key: string, number: string, x: number) => ({
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
  areas: [{ key: 'qaarea01', name: 'בפנים', order: 0 }],
  tables: [T('qatable7', '7', 0), T('qatable8', '8', 5)],
  joins: [{ key: 'qajoin01', tableKeys: ['qatable7', 'qatable8'], minSeats: 5, maxSeats: 8, online: true }]
}

test('666-2: removing a join shows "החיבור בוטל"', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))

  await page.goto('/frontdesk/floor-plan')
  await page.getByRole('button', { name: 'ביטול החיבור' }).click()
  await expect(page.getByText('החיבור בוטל')).toBeVisible()
  await page.screenshot({ path: 'screens/666-2.png' })
})
