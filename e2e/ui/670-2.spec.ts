import { test, expect } from '@playwright/test'

const SLUG = 'e2e-670'
const profile = {
  available: true,
  displayName: 'הבית',
  hours: [],
  kinds: [{ kind: 'table', questions: [], rules: {} }],
  tableBooking: { areas: [] }
}

const daysAhead = (n: number): { iso: string; typed: string } => {
  const d = new Date(Date.now() + n * 86_400_000)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return { iso: `${d.getFullYear()}-${mm}-${dd}`, typed: `${dd}${mm}${d.getFullYear()}` }
}

test('670-2: a full day offers the next free time and tapping it picks that date and hour', async ({ page }) => {
  const full = daysAhead(1)
  const free = daysAhead(3)
  await page.route('**/api/v1/public/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/availability')) {
      return route.fulfill({
        json: url.includes(`date=${full.iso}`)
          ? { slots: [{ time: '19:00', available: false }], next: { date: free.iso, time: '19:30' } }
          : { slots: [{ time: '19:30', available: true }] }
      })
    }
    return route.fulfill({ json: profile })
  })
  await page.goto(`/book/${SLUG}`)
  await page.locator('#pb-date').fill(full.typed)
  await expect(page.getByText('אין מקום פנוי ביום הזה')).toBeVisible()
  const next = page.getByTestId('pb-next-free')
  await expect(next).toContainText('19:30')
  await next.click()
  await expect(page.getByTestId('pb-time-19:30')).toBeChecked()
  await page.screenshot({ path: 'screens/670-2.png' })
})
