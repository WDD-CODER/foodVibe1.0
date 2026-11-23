import { test, expect } from '@playwright/test'

const DATE = '2031-06-15'

test('670-1: pick a free hour, send, read that the table is confirmed, add to calendar', async ({ page }) => {
  await page.route('**/api/v1/public/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/availability')) {
      return route.fulfill({
        json: {
          slots: [
            { time: '19:00', available: false },
            { time: '20:00', available: true }
          ]
        }
      })
    }
    if (url.endsWith('/requests') && route.request().method() === 'POST') {
      return route.fulfill({
        json: {
          reference: 'ABCD1234',
          token: 'T'.repeat(32),
          confirmed: true,
          booking: { date: DATE, time: '20:00', partySize: 2 }
        }
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
  await page.getByTestId('pb-time-20:00').click()
  await page.getByTestId('pb-next').click()
  await page.locator('#pb-name').fill('אורח בדיקה')
  await page.locator('#pb-phone').fill('0501234567')
  await page.getByTestId('pb-consent').check()
  await page.getByTestId('pb-submit').click()
  await expect(page.getByText('השולחן שלכם מאושר')).toBeVisible()
  await expect(page.getByRole('button', { name: 'הוספה ליומן' })).toBeVisible()
  await page.screenshot({ path: 'screens/670-1.png' })
})
