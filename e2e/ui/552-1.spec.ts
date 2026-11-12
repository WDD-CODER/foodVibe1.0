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

async function createClient(request: APIRequestContext, headers: Record<string, string>, name: string): Promise<string> {
  const res = await request.post(`${API}/api/v1/data/clients`, {
    headers,
    data: { name, phone: '05' + String(Date.now()).slice(-8) }
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json())._id as string
}

async function createRequest(
  request: APIRequestContext,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<{ _id: string }> {
  const res = await request.post(`${API}/api/v1/requests`, { headers, data: { answers: [], ...body } })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

test('552-1: approving a table request moves it to approved and the agenda shows the guest', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const name = 'E2E אורח ' + Date.now()
  const date = '2030-05-01'
  const profileId = await ensureProfile(request, headers)
  const clientId = await createClient(request, headers, name)
  try {
    await createRequest(request, headers, { kind: 'table', clientId, wanted: { date, time: '19:00', partySize: 2 } })
    await page.goto('/requests')
    const card = page.getByTestId('request-card').filter({ hasText: name })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'אישור', exact: true }).click()
    await page.getByTestId('tab-approved').click()
    await expect(page.getByTestId('request-card').filter({ hasText: name })).toBeVisible()
    await page.screenshot({ path: 'screens/552-1.png' })
    await page.goto('/bookings?date=' + date)
    await expect(page.getByTestId('booking-row').filter({ hasText: name })).toBeVisible()
  } finally {
    const bookings = await (await request.get(`${API}/api/v1/data/bookings`, { headers })).json()
    for (const b of (bookings as { _id: string; clientId: string }[]).filter((x) => x.clientId === clientId))
      await request.put(`${API}/api/v1/bookings/${b._id}/status`, { headers, data: { status: 'cancelled' } })
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers }).catch(() => undefined)
    if (profileId)
      await request.delete(`${API}/api/v1/data/frontDeskProfiles/${profileId}?permanent=true`, { headers }).catch(() => undefined)
  }
})
