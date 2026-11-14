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

test('552-4: a phone request typed in the dialog shows under waiting', async ({ page, context, request }) => {
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
    await page.goto('/requests')
    await page.getByTestId('new-request').click()
    await page.locator('#nr-kind').click()
    await page.getByRole('option', { name: 'טעימה' }).click()
    await page.locator('#nr-client').fill(name)
    await page.getByRole('option', { name }).click()
    await page.locator('#nr-date').fill('01/05/2030')
    await page.locator('#nr-party').fill('12')
    await page.getByTestId('new-request-save').click()
    await expect(page.getByTestId('tab-waiting')).toHaveClass(/active/)
    await expect(page.getByTestId('request-card').filter({ hasText: name })).toBeVisible()
    await page.screenshot({ path: 'screens/552-4.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers }).catch(() => undefined)
    if (profileId)
      await request.delete(`${API}/api/v1/data/frontDeskProfiles/${profileId}?permanent=true`, { headers }).catch(() => undefined)
  }
})
