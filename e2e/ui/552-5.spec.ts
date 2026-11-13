import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

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

const todayLocal = (): string => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

test('552-5: pressing arrived on a confirmed booking shows the arrived status', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const name = 'E2E אורח ' + Date.now()
  const date = todayLocal()
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
      data: { kind: 'table', clientId, wanted: { date, time: '23:30', partySize: 2 }, answers: [] }
    })
    expect(created.ok()).toBeTruthy()
    const approved = await request.post(`${API}/api/v1/requests/${(await created.json())._id}/approve`, {
      headers,
      data: {}
    })
    expect(approved.ok()).toBeTruthy()
    await page.goto('/bookings?date=' + date)
    const row = page.getByTestId('booking-row').filter({ hasText: name })
    await row.getByTestId('bk-seated').click()
    await expect(row.getByTestId('booking-status')).toHaveText('הגיעו')
    await page.screenshot({ path: 'screens/552-5.png' })
  } finally {
    const bookings = await (await request.get(`${API}/api/v1/data/bookings`, { headers })).json()
    for (const b of (bookings as { _id: string; clientId: string }[]).filter((x) => x.clientId === clientId))
      await request.put(`${API}/api/v1/bookings/${b._id}/status`, { headers, data: { status: 'cancelled' } })
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers }).catch(() => undefined)
    if (profileId)
      await request.delete(`${API}/api/v1/data/frontDeskProfiles/${profileId}?permanent=true`, { headers }).catch(() => undefined)
  }
})
