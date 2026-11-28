import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

test('772-1: a picked dish font and title font stay on the sample menu', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = (modules: string[]) =>
    request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, {
      headers,
      data: { modules, reason: 'e2e 772' }
    })
  try {
    expect((await put(['events', 'menu_design'])).ok()).toBeTruthy()
    await page.goto('/menu-design/new?base=classic')
    await page.locator('[data-font-slot="dish"] label', { hasText: 'Amatic SC' }).click()
    await page.locator('[data-font-slot="title"] label', { hasText: 'Suez One' }).click()
    // Long enough for the preview to draw again and for anything that would write the old font back.
    await page.waitForTimeout(3000)
    const preview = page.frameLocator('app-menu-designer app-menu-preview iframe').first()
    await expect(preview.locator('.md-dish').first()).toHaveCSS('font-family', /^"Amatic SC"/)
    await expect(preview.locator('.md-title')).toHaveCSS('font-family', /^"Suez One"/)
    await page.screenshot({ path: 'screens/772-1.png' })
  } finally {
    await put(DEFAULTS)
  }
})
