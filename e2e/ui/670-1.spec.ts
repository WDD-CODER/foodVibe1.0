import { test, expect } from '@playwright/test'

const SLUG = 'e2e-670'
const profile = {
  available: true,
  displayName: 'הבית',
  address: 'הרצל 1',
  hours: [],
  kinds: [{ kind: 'table', questions: [], rules: {}, durationMinutes: 90 }],
  tableBooking: { areas: [] }
}

const tomorrow = (): { iso: string; typed: string } => {
  const d = new Date(Date.now() + 86_400_000)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return { iso: `${d.getFullYear()}-${mm}-${dd}`, typed: `${dd}${mm}${d.getFullYear()}` }
}

test('670-1: a guest picks a free hour chip and reads that the table is confirmed', async ({ page }) => {
  const day = tomorrow()
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
    if (route.request().method() === 'POST' && url.includes('/requests')) {
      return route.fulfill({
        json: {
          reference: 'ABCD1234',
          token: 'T'.repeat(32),
          confirmed: true,
          booking: { date: day.iso, time: '20:00', partySize: 2 }
        }
      })
    }
    return route.fulfill({ json: profile })
  })
  await page.goto(`/book/${SLUG}`)
  await page.locator('#pb-date').fill(day.typed)
  await page.getByTestId('pb-time-20:00').check({ force: true })
  await page.getByTestId('pb-next').click()
  await page.locator('#pb-name').fill('אורח בדיקה')
  await page.locator('#pb-phone').fill('0501234567')
  await page.getByTestId('pb-consent').check()
  await page.getByTestId('pb-submit').click()
  await expect(page.getByText('השולחן שלכם מאושר')).toBeVisible()
  await expect(page.getByRole('button', { name: 'הוספה ליומן' })).toBeVisible()
  await page.screenshot({ path: 'screens/670-1.png' })
})
