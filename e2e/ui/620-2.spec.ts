import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('620-2: opening /menu-library without events lands on the dashboard', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = (modules: string[]) =>
    request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, { headers, data: { modules, reason: 'e2e 620' } })
  try {
    await put(['frontdesk', 'ai_create'])
    await page.goto('/menu-library')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'לוח בקרה' }).first()).toBeVisible()
    await page.screenshot({ path: 'screens/620-2.png' })
  } finally {
    await put(DEFAULTS)
  }
})
