import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('620-1: a business without events has no events link in the header', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = (modules: string[]) =>
    request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, { headers, data: { modules, reason: 'e2e 620' } })
  try {
    await put(['frontdesk', 'ai_create'])
    const refused: string[] = []
    page.on('response', (res) => {
      if (res.status() === 403) refused.push(res.url())
    })
    await page.goto('/dashboard')
    await expect(page.locator('app-header')).toBeVisible()
    await expect(page.locator('app-header').getByText('תפריטי אירוע')).toHaveCount(0)
    expect(refused).toEqual([])
    await page.screenshot({ path: 'screens/620-1.png' })
  } finally {
    await put(DEFAULTS)
  }
})
