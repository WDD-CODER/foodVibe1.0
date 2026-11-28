import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('766-2: a change in words updates the preview, and undo brings the previous design back', async ({
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
      data: { modules, reason: 'e2e 766' }
    })
  try {
    expect((await put(['events', 'menu_design'])).ok()).toBeTruthy()
    // No model call: the answer is the sent design with bigger dish names and its own title color.
    await page.route('**/api/v1/ai/menu-design/refine', (route) => {
      const { design } = route.request().postDataJSON()
      return route.fulfill({
        json: {
          design: {
            ...design,
            colors: { ...design.colors, title: '#b91c1c' },
            layout: { ...design.layout, dishSize: 'l' },
            origin: 'ai'
          },
          fallback: false
        }
      })
    })
    await page.goto('/menu-design/new?base=classic')
    const preview = page.locator('.menu-designer__preview iframe')
    await expect(preview).toHaveAttribute('srcdoc', /--md-title: #5a3b1e/)
    const box = page.locator('app-menu-design-ai-refine')
    await box.getByLabel('שינוי במילים').fill('שמות מנות גדולים יותר')
    await box.getByRole('button', { name: 'החלה' }).click()
    await expect(preview).toHaveAttribute('srcdoc', /--md-title: #b91c1c/)
    await page.screenshot({ path: 'screens/766-2.png' })
    await box.getByRole('button', { name: 'ביטול השינוי' }).click()
    await expect(preview).toHaveAttribute('srcdoc', /--md-title: #5a3b1e/)
  } finally {
    await put(DEFAULTS)
  }
})
