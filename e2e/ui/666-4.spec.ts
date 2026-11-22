import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const PLAN = {
  _id: 'qa-fp',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'qaarea01', name: 'בפנים', order: 0 }],
  tables: [],
  joins: []
}

test('666-4: at 375 px a table is added, moved with an arrow and saved', async ({ page, context }) => {
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
  await page.getByRole('button', { name: 'ל-2' }).click()
  await page.getByRole('button', { name: 'הזזה שמאלה' }).click()
  await page.getByRole('button', { name: 'שמור' }).click()
  await expect(page.getByText('המפה נשמרה')).toBeVisible()
  await page.screenshot({ path: 'screens/666-4.png' })
})
