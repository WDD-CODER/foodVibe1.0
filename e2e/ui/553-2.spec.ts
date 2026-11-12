import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
type Headers = Record<string, string>

/** Deletes every front desk profile of the QA business (so a test starts from none). */
async function clearProfiles(request: APIRequestContext, headers: Headers): Promise<void> {
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers })).json()
  for (const p of Array.isArray(list) ? (list as { _id: string }[]) : [])
    await request
      .delete(`${API}/api/v1/data/frontDeskProfiles/${p._id}?permanent=true`, { headers })
      .catch(() => undefined)
}

/** Makes sure the business has a catering-shaped profile; returns its id when this call created it. */
async function ensureProfile(request: APIRequestContext, headers: Headers): Promise<string | null> {
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers })).json()
  if (Array.isArray(list) && list.length) return null
  const kind = (minutes?: number) => ({
    enabled: true,
    questions: [{ key: 'date', label: 'fd_q_date', type: 'date', required: true }],
    rules: {},
    ...(minutes ? { defaultDurationMinutes: minutes } : {}),
    expireAfterHours: 24
  })
  const res = await request.post(`${API}/api/v1/data/frontDeskProfiles`, {
    headers,
    data: {
      businessType: 'catering',
      slug: 'e2e-' + Date.now().toString(36),
      displayName: 'E2E',
      hours: [],
      requestKinds: { event: kind(), tasting: kind(60) },
      assistant: { level: 0, tone: 'warm' }
    }
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json())._id as string
}

test('553-2: an unsaved change asks before leaving', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const created = await ensureProfile(request, headers)
  try {
    await page.goto('/frontdesk/settings')
    await page.getByTestId('kind-enabled-tasting').uncheck()
    await page.locator('a[href="/dashboard"]').first().click()
    await expect(page.getByText('יש שינויים שלא נשמרו')).toBeVisible()
    await page.screenshot({ path: 'screens/553-2.png' })
  } finally {
    if (created) await clearProfiles(request, headers)
  }
})
