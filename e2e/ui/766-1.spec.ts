import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

/** A complete design with its own title color, written here so the test does not depend on the app's base looks. */
const look = (title: string) => ({
  design: {
    baseTemplate: 'modern',
    fonts: { title: 'heebo', section: 'rubik', dish: 'assistant' },
    colors: { page: '#ffffff', text: '#1f2933', title, section: '#0f766e', accent: '#0f766e', border: '#d1d5db' },
    background: { kind: 'color', imageFit: 'cover', veil: 0 },
    frame: { style: 'none', width: 0, inset: 'normal' },
    divider: 'line',
    logo: { size: 's', placement: 'top' },
    layout: { align: 'start', density: 'airy', titleSize: 'l', sectionSize: 'm', dishSize: 'm' },
    fixedTexts: {},
    origin: 'ai'
  },
  fallback: false
})

test('766-1: a description gives three sample menus, and picking the second puts it in the editor', async ({
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
    // No model call: the answer is fixed here.
    await page.route('**/api/v1/ai/menu-design/variants', (route) =>
      route.fulfill({ json: { variants: [look('#1d4ed8'), look('#b91c1c'), look('#15803d')] } })
    )
    await page.goto('/menu-design/new?base=classic')
    const panel = page.locator('app-menu-design-ai-panel')
    await expect(panel).toContainText('עיצוב בעזרת AI')
    await panel.getByText('תיאור', { exact: true }).first().click()
    await panel.locator('textarea').fill('כהה ואלגנטי')
    await panel.getByRole('button', { name: 'הצעת עיצובים' }).click()
    const cards = page.getByTestId('menu-design-ai-variant')
    await expect(cards).toHaveCount(3)
    for (let i = 0; i < 3; i++) await expect(cards.nth(i).locator('iframe')).toBeVisible()
    await page.screenshot({ path: 'screens/766-1.png' })
    await cards.nth(1).getByRole('button', { name: 'בחירה' }).click()
    await expect(cards).toHaveCount(0)
    await expect(page.locator('.menu-designer__preview iframe')).toHaveAttribute('srcdoc', /--md-title: #b91c1c/)
  } finally {
    await put(DEFAULTS)
  }
})
