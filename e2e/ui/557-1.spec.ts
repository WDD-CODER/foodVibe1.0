import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
type Headers = Record<string, string>

async function clearProfiles(request: APIRequestContext, headers: Headers): Promise<void> {
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers })).json()
  for (const p of Array.isArray(list) ? (list as { _id: string }[]) : [])
    await request
      .delete(`${API}/api/v1/data/frontDeskProfiles/${p._id}?permanent=true`, { headers })
      .catch(() => undefined)
}

test('557-1: the owner exports clients and a clients-<date>.csv file downloads', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  await clearProfiles(request, headers)
  try {
    await page.goto('/frontdesk/settings')
    await page.locator('#fd-new-type').click()
    await page.getByRole('option', { name: 'קייטרינג ואירועים' }).click()
    await page.locator('#fd-new-name').fill('E2E קייטרינג')
    await page.locator('#fd-new-slug').fill('e2e-' + Date.now().toString(36))
    await page.getByTestId('create-profile').click()
    await expect(page.getByTestId('card-export')).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'ייצוא לקוחות (CSV)' }).click()
    expect((await download).suggestedFilename()).toMatch(/^clients-\d{4}-\d{2}-\d{2}\.csv$/)
    await page.screenshot({ path: 'screens/557-1.png' })
  } finally {
    await clearProfiles(request, headers)
  }
})
