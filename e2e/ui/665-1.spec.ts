import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// The QA business has the four default modules: the spec adds `tables` and answers the floor-plan read itself.
test('665-1: the chip "מפת המקום" opens the floor plan page', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'tables'] } })
  })
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: null } }))

  await page.goto('/requests')
  await page.getByRole('link', { name: 'מפת המקום' }).click()
  await expect(page.getByRole('heading', { name: 'מפת המקום' })).toBeVisible()
  await page.screenshot({ path: 'screens/665-1.png' })
})
