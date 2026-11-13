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

test('552-2: an approved event request opens its inquiry', async ({ page, context, request }) => {
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
  let eventId: string | undefined
  try {
    const created = await request.post(`${API}/api/v1/requests`, {
      headers,
      data: { kind: 'event', clientId, wanted: { date: '2030-06-01', partySize: 30 }, answers: [] }
    })
    expect(created.ok()).toBeTruthy()
    await page.goto('/requests')
    await page
      .getByTestId('request-card')
      .filter({ hasText: name })
      .getByRole('button', { name: 'אישור', exact: true })
      .click()
    await page.getByTestId('tab-approved').click()
    const link = page.getByRole('link', { name: 'פתיחת האירוע' })
    await expect(link).toBeVisible()
    await page.screenshot({ path: 'screens/552-2.png' })
    await link.click()
    await expect(page).toHaveURL(/\/menu-intelligence\/[^/]+$/)
    eventId = page.url().split('/').pop()
  } finally {
    if (eventId)
      await request.delete(`${API}/api/v1/data/menuEvents/${eventId}?permanent=true`, { headers }).catch(() => undefined)
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers }).catch(() => undefined)
    if (profileId)
      await request.delete(`${API}/api/v1/data/frontDeskProfiles/${profileId}?permanent=true`, { headers }).catch(() => undefined)
  }
})
