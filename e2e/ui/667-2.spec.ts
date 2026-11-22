import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const profile = {
  _id: 'qa-profile',
  schemaVersion: 2,
  businessId: 'qa',
  createdAt: 1763500000000,
  updatedAt: 1763500000000,
  businessType: 'restaurant',
  slug: 'qa-place',
  displayName: 'מסעדת בדיקה',
  hours: [],
  closedDates: [],
  requestKinds: { table: { enabled: true, questions: [], rules: {}, expireAfterHours: 24 } },
  assistant: { level: 0, tone: 'warm' },
  status: 'draft'
}

test('667-2: the booking page QR code and its print button show beside the public link', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'frontdesk', 'tables'] } })
  })
  await page.route('**/api/v1/data/frontDeskProfiles**', (route) => route.fulfill({ json: [profile] }))

  await page.goto('/frontdesk/settings')
  const qr = page.locator('[data-testid="booking-qr"]')
  const img = qr.locator('img')
  await expect(img).toBeVisible()
  await expect(img).toHaveAttribute('src', /^data:image\/png/)
  await expect(qr.getByRole('button', { name: 'הדפסת קוד QR' })).toBeVisible()
  await page.screenshot({ path: 'screens/667-2.png' })
})
