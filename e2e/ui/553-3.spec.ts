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

test('553-3: copying the link shows the toast', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined)
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const created = await ensureProfile(request, headers)
  try {
    await page.goto('/frontdesk/settings')
    await page.getByRole('button', { name: 'העתקת הקישור' }).click()
    await expect(page.getByText('הקישור הועתק')).toBeVisible()
    await page.screenshot({ path: 'screens/553-3.png' })
  } finally {
    if (created) await clearProfiles(request, headers)
  }
})
