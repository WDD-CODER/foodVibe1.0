import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('665-4: two tables are saved and are still there after a reload', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  let stored: Record<string, unknown> | null = null
  await page.route('**/api/v1/floor-plan', async (route) => {
    if (route.request().method() === 'PUT') {
      stored = { _id: 'qa-fp', ...route.request().postDataJSON() }
      return route.fulfill({ json: { plan: stored } })
    }
    return route.fulfill({ json: { plan: stored } })
  })

  await page.goto('/frontdesk/floor-plan')
  await page.getByRole('button', { name: 'ל-2' }).click()
  await page.getByRole('button', { name: 'ל-2' }).click()
  await page.getByRole('button', { name: 'שמור' }).click()
  await expect(page.getByText('המפה נשמרה')).toBeVisible()
  await page.screenshot({ path: 'screens/665-4.png' })

  await page.reload()
  await expect(page.locator('[data-testid="floor-table-1"]')).toBeVisible()
  await expect(page.locator('[data-testid="floor-table-2"]')).toBeVisible()
})
