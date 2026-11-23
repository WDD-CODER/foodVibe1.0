import { test, expect } from '@playwright/test'

test('670-2: a full day says so and offers the next free time', async ({ page }) => {
  await page.route('**/api/v1/public/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/availability')) {
      const full = url.includes('date=2031-06-15')
      return route.fulfill({
        json: full
          ? {
              slots: [{ time: '20:00', available: false }],
              next: { date: '2031-06-16', time: '19:30' }
            }
          : { slots: [{ time: '19:30', available: true }] }
      })
    }
    return route.fulfill({
      json: {
        available: true,
        displayName: 'הבית',
        hours: [],
        kinds: [{ kind: 'table', questions: [], rules: {} }],
        tableBooking: { areas: [{ key: 'areaa1', name: 'בפנים' }] }
      }
    })
  })
  await page.goto('/book/e2e-670')
  await page.locator('#pb-date').fill('15062031')
  await expect(page.getByText('אין מקום פנוי ביום הזה')).toBeVisible()
  const next = page.getByTestId('pb-next-free')
  await expect(next).toContainText('19:30')
  await page.screenshot({ path: 'screens/670-2.png' })
  await next.click()
  await expect(page.locator('#pb-date')).toHaveValue(/16/)
  await expect(page.getByTestId('pb-time-19:30').locator('input')).toBeChecked()
})
