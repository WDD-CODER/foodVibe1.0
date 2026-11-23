import { test, expect } from '@playwright/test'

const SLUG = 'e2e-670'
const profile = {
  available: true,
  displayName: 'הבית',
  hours: [],
  kinds: [{ kind: 'table', questions: [], rules: {} }]
}

test('670-3: a business without table service keeps the time field and makes no availability read', async ({
  page
}) => {
  let availabilityReads = 0
  await page.route('**/api/v1/public/**', async (route) => {
    if (route.request().url().includes('/availability')) availabilityReads++
    return route.fulfill({ json: profile })
  })
  await page.goto(`/book/${SLUG}`)
  await expect(page.locator('#pb-time')).toBeVisible()
  await expect(page.getByTestId('pb-times')).toHaveCount(0)
  expect(availabilityReads).toBe(0)
  await page.screenshot({ path: 'screens/670-3.png' })
})
