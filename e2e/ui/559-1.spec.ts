import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const kind = {
  enabled: true,
  questions: [],
  rules: {},
  defaultDurationMinutes: 120,
  expireAfterHours: 24
}

let ownerHeaders: Record<string, string> = {}
let requestId = ''

test.beforeAll(async ({ request, browser }) => {
  const context = await browser.newContext()
  const session = await signInQa(context)
  await context.close()
  ownerHeaders = { authorization: `Bearer ${session.token}` }
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers: ownerHeaders })).json()
  if (!Array.isArray(list) || !list.length) {
    const made = await request.post(`${API}/api/v1/data/frontDeskProfiles`, {
      headers: ownerHeaders,
      data: {
        businessType: 'other',
        slug: 'e2e-559-qa',
        displayName: 'E2E',
        hours: [],
        requestKinds: { table: kind },
        assistant: { level: 0, tone: 'warm' }
      }
    })
    expect(made.ok()).toBeTruthy()
  }
  const created = await request.post(`${API}/api/v1/requests`, {
    headers: ownerHeaders,
    data: {
      kind: 'table',
      guestName: 'אורח בדיקה',
      guestPhone: '0501234559',
      wanted: { date: '2031-06-15', time: '19:00', partySize: 2 },
      answers: []
    }
  })
  expect(created.status()).toBe(201)
  requestId = ((await created.json()) as { _id: string })._id
})

test.afterAll(async ({ request }) => {
  if (!requestId) return
  await request.put(`${API}/api/v1/requests/${requestId}/status`, { headers: ownerHeaders, data: { status: 'cancelled' } })
})

test('559-1: after a manual request the dashboard shows the card "השבוע בקבלה" with the request count', async ({
  page,
  context,
  request
}) => {
  await signInQa(context)
  const stats = await (await request.get(`${API}/api/v1/stats/frontdesk`, { headers: ownerHeaders })).json()
  await page.goto('/dashboard')
  const card = page.locator('[data-testid="frontdesk-week-card"]')
  await expect(card).toBeVisible()
  await expect(card.getByText('השבוע בקבלה')).toBeVisible()
  await expect(card.locator('[data-testid="frontdesk-week-sentence"]')).toContainText(`השבוע התקבלו ${stats.requests.total} בקשות`)
  await page.screenshot({ path: 'screens/559-1.png' })
})
