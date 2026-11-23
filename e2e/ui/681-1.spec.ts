import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

/** Plan 681: one open request with the assistant's suggestion; the requests list is answered by this spec. */
const REQUEST = {
  _id: 'e2e681r1',
  schemaVersion: 2,
  businessId: 'qa',
  createdBy: 'public:sim',
  createdAt: Date.now() - 60_000,
  updatedAt: Date.now() - 60_000,
  kind: 'table',
  status: 'qualified',
  channel: 'whatsapp',
  clientId: 'e2e681c1',
  guestName: 'E2E אורח 681',
  guestPhone: '0521234567',
  wanted: { date: '2030-05-01', time: '19:00', partySize: 4 },
  answers: [],
  qualification: { verdict: 'fit', reasons: [], by: 'rules' },
  statusHistory: [{ status: 'qualified', at: Date.now() - 60_000, by: 'public:sim', byName: '', via: 'ai' }],
  publicToken: 'e2e681tokene2e681tokene2e681tok',
  suggested: { action: 'approve', text: 'שולחן פנוי, קבוצה בגודל רגיל', at: Date.now() - 60_000 }
}

test('681-1: the request card shows the assistant suggestion', async ({ page, context }) => {
  await signInQa(context)
  await page.route(/\/api\/v1\/requests(\?.*)?$/, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([REQUEST]) })
      : route.continue()
  )
  await page.goto('/requests')
  const card = page.getByTestId('request-card').filter({ hasText: 'E2E אורח 681' })
  await expect(card).toBeVisible()
  await expect(card.getByTestId('request-suggested')).toContainText('העוזר מציע: לאשר')
  await expect(card.getByTestId('request-suggested')).toContainText('שולחן פנוי, קבוצה בגודל רגיל')
  await page.screenshot({ path: 'screens/681-1.png' })
})
