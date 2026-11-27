import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('765-1: the menu designs button and page exist only with the menu_design module', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = async (modules: string[]) => {
    const res = await request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, {
      headers,
      data: { modules, reason: 'e2e 765' }
    })
    expect(res.ok()).toBeTruthy()
  }
  const button = page.getByRole('button', { name: 'עיצובי תפריט' })
  try {
    await put(['events', 'menu_design'])
    await page.goto('/menu-library')
    await expect(button).toBeVisible()
    await page.screenshot({ path: 'screens/765-1.png' })

    await put(DEFAULTS)
    await page.goto('/menu-library')
    await expect(page.getByRole('button', { name: 'תפריט חדש' })).toBeVisible()
    await expect(button).toHaveCount(0)
    await page.goto('/menu-design')
    await expect(page).toHaveURL(/\/dashboard/)
  } finally {
    await put(DEFAULTS)
  }
})
