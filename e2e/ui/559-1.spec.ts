import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

/** Makes sure the business has a front desk profile with every kind on; returns its id when this test created it. */
async function ensureProfile(request: APIRequestContext, headers: Record<string, string>): Promise<string | null> {
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers })).json()
  if (Array.isArray(list) && list.length) return null
  const kind = (minutes?: number) => ({
    enabled: true,
    questions: [],
    rules: {},
    ...(minutes ? { defaultDurationMinutes: minutes } : {}),
    expireAfterHours: 24
  })
  const res = await request.post(`${API}/api/v1/data/frontDeskProfiles`, {
    headers,
    data: {
      businessType: 'other',
      slug: 'e2e-' + Date.now().toString(36),
      displayName: 'E2E',
      hours: [],
      requestKinds: { table: kind(120), event: kind(), tasting: kind(60), consultation: kind(30) },
      assistant: { level: 0, tone: 'warm' }
    }
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json())._id as string
}

test('559-1: after one manual request the dashboard shows the week card with 1 request', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const name = 'E2E אורח ' + Date.now()
  const profileId = await ensureProfile(request, headers)
  const clientRes = await request.post(`${API}/api/v1/data/clients`, {
    headers,
    data: { name, phone: '05' + String(Date.now()).slice(-8) }
  })
  expect(clientRes.ok()).toBeTruthy()
  const clientId = (await clientRes.json())._id as string
  try {
    const created = await request.post(`${API}/api/v1/requests`, {
      headers,
      data: { answers: [], kind: 'table', clientId, wanted: { date: '2030-05-01', time: '19:00', partySize: 2 } }
    })
    expect(created.ok()).toBeTruthy()
    await page.goto('/dashboard')
    const card = page.getByTestId('frontdesk-week-card')
    await expect(card).toBeVisible()
    await expect(card).toContainText('השבוע בקבלה')
    await expect(page.getByTestId('frontdesk-week-sentence')).toContainText(/התקבלו \d+ בקשות/)
    await page.screenshot({ path: 'screens/559-1.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers }).catch(() => undefined)
    if (profileId)
      await request.delete(`${API}/api/v1/data/frontDeskProfiles/${profileId}?permanent=true`, { headers }).catch(() => undefined)
  }
})
