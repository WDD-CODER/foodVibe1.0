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

test('553-1: no profile shows the type picker; creating a catering profile shows the event card', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  await clearProfiles(request, headers)
  try {
    await page.goto('/frontdesk/settings')
    await expect(page.getByText('בחרו את סוג העסק')).toBeVisible()
    await page.locator('#fd-new-type').click()
    await page.getByRole('option', { name: 'קייטרינג ואירועים' }).click()
    await page.locator('#fd-new-name').fill('E2E קייטרינג')
    await page.locator('#fd-new-slug').fill('e2e-' + Date.now().toString(36))
    await page.getByTestId('create-profile').click()
    await expect(page.getByTestId('kind-card-event')).toBeVisible()
    await expect(page.getByTestId('kind-card-event').getByTestId('question-row').first()).toBeVisible()
    await page.screenshot({ path: 'screens/553-1.png' })
  } finally {
    await clearProfiles(request, headers)
  }
})
