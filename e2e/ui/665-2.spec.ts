import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('665-2: pressing "ל-4" adds table 1 to the map', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: null } }))

  await page.goto('/frontdesk/floor-plan')
  await page.getByRole('button', { name: 'ל-4' }).click()
  await expect(page.locator('[data-testid="floor-table-1"]')).toBeVisible()
  await page.screenshot({ path: 'screens/665-2.png' })
})
