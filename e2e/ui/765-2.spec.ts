import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('765-2: an empty designs list offers a new design, and a base look opens the editor', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = (modules: string[]) =>
    request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, {
      headers,
      data: { modules, reason: 'e2e 765' }
    })
  try {
    expect((await put(['events', 'menu_design'])).ok()).toBeTruthy()
    // "No designs" without deleting anyone's: the list answers empty for this page only.
    await page.route('**/api/v1/data/menuDesigns', (route) =>
      route.request().method() === 'GET' ? route.fulfill({ json: [] }) : route.continue()
    )
    await page.goto('/menu-design')
    const empty = page.locator('app-empty-state')
    await expect(empty).toContainText('עוד אין עיצובים לתפריט')
    await empty.getByRole('button', { name: 'עיצוב חדש' }).click()
    await page.getByRole('button', { name: 'קלאסי' }).click()
    await expect(page).toHaveURL(/\/menu-design\/new\?base=classic/)
    await expect(page.frameLocator('app-menu-designer iframe').locator('body')).toContainText('תפריט לדוגמה')
    await page.screenshot({ path: 'screens/765-2.png' })
  } finally {
    await put(DEFAULTS)
  }
})
