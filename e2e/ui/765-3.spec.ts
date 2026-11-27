import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('765-3: the typed business name shows in the preview at once, and a saved design is listed', async ({
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
  const designIds = async (): Promise<string[]> => {
    const res = await request.get(`${API}/api/v1/data/menuDesigns`, { headers })
    expect(res.ok()).toBeTruthy()
    return ((await res.json()) as { _id: string }[]).map((design) => design._id)
  }
  let before: string[] | null = null
  try {
    expect((await put(['events', 'menu_design'])).ok()).toBeTruthy()
    before = await designIds()
    await page.goto('/menu-design/new?base=classic')
    await page.getByLabel('שם העסק').fill('מסעדת הים')
    await expect(page.frameLocator('app-menu-designer iframe').locator('body')).toContainText('מסעדת הים')
    await page.getByLabel('שם העיצוב').fill('ערב חתונה')
    await page.getByRole('button', { name: 'שמירה' }).click()
    await expect(page).toHaveURL(/\/menu-design$/)
    await expect(page.locator('.design-card__name', { hasText: 'ערב חתונה' }).first()).toBeVisible()
    await page.screenshot({ path: 'screens/765-3.png' })
  } finally {
    if (before) {
      // Only what this run created.
      for (const id of (await designIds()).filter((id) => !before!.includes(id))) {
        await request.delete(`${API}/api/v1/data/menuDesigns/${id}?permanent=true`, { headers })
      }
    }
    await put(DEFAULTS)
  }
})
