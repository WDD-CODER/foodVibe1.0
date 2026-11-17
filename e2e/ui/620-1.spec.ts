import { test, expect, type APIRequestContext } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

async function setModules(request: APIRequestContext, token: string, modules: string[]): Promise<void> {
  const headers = { authorization: `Bearer ${token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const res = await request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, {
    headers,
    data: { modules, reason: 'e2e 620' }
  })
  expect(res.ok()).toBeTruthy()
}

test('620-1: without the events module the header has no menu library link', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const bad: string[] = []
  page.on('response', (res) => {
    if (res.status() === 403) bad.push(res.url())
  })
  try {
    await setModules(request, session.token, ['frontdesk', 'ai_create'])
    await page.goto('/dashboard')
    await expect(page.locator('app-header')).toBeVisible()
    await expect(page.locator('app-header').getByText('תפריטי אירוע')).toHaveCount(0)
    expect(bad).toEqual([])
    await page.screenshot({ path: 'screens/620-1.png' })
  } finally {
    await setModules(request, session.token, DEFAULTS)
  }
})
