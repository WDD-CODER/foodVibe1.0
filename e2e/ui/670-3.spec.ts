import { test, expect } from '@playwright/test'

test('670-3: a business without table service keeps the time field and reads no availability', async ({ page }) => {
  const reads: string[] = []
  await page.route('**/api/v1/public/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/availability')) {
      reads.push(url)
      return route.fulfill({ status: 404, json: { error: 'NOT_FOUND' } })
    }
    return route.fulfill({
      json: {
        available: true,
        displayName: 'הבית',
        hours: [],
        kinds: [{ kind: 'table', questions: [], rules: {} }]
      }
    })
  })
  await page.goto('/book/e2e-670')
  await page.locator('#pb-date').fill('15062031')
  await expect(page.locator('#pb-time')).toBeVisible()
  await expect(page.getByTestId('pb-times')).toHaveCount(0)
  expect(reads).toEqual([])
  await page.screenshot({ path: 'screens/670-3.png' })
})
