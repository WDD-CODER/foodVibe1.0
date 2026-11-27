import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

/** A complete design, written here so the test does not depend on the app's own base looks. */
const LOOK = {
  baseTemplate: 'modern',
  fonts: { title: 'heebo', section: 'rubik', dish: 'assistant' },
  colors: { page: '#ffffff', text: '#1f2933', title: '#111827', section: '#0f766e', accent: '#0f766e', border: '#d1d5db' },
  background: { kind: 'color', imageFit: 'cover', veil: 0 },
  frame: { style: 'none', width: 0, inset: 'normal' },
  divider: 'line',
  logo: { size: 's', placement: 'top' },
  layout: { align: 'start', density: 'airy', titleSize: 'l', sectionSize: 'm', dishSize: 'm' },
  fixedTexts: {},
  origin: 'manual'
}

test('765-4: the row menu moves the default and copies a design', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = (modules: string[]) =>
    request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, {
      headers,
      data: { modules, reason: 'e2e 765' }
    })
  const setDefault = (designId: string) =>
    request.put(`${API}/api/v1/business/menu-design-default`, { headers, data: { designId } })
  const list = async (): Promise<{ _id: string }[]> => {
    const res = await request.get(`${API}/api/v1/data/menuDesigns`, { headers })
    expect(res.ok()).toBeTruthy()
    return res.json()
  }
  const stamp = Date.now()
  const first = `E2E א ${stamp}`
  const second = `E2E ב ${stamp}`
  const card = (name: string) =>
    page.locator('article.design-card').filter({ has: page.getByRole('heading', { name, exact: true }) })
  let before: string[] | null = null
  try {
    expect((await put(['events', 'menu_design'])).ok()).toBeTruthy()
    before = (await list()).map((design) => design._id)
    const ids: string[] = []
    for (const name of [first, second]) {
      const res = await request.post(`${API}/api/v1/data/menuDesigns`, { headers, data: { ...LOOK, name } })
      expect(res.ok()).toBeTruthy()
      ids.push((await res.json())._id)
    }
    expect((await setDefault(ids[0])).ok()).toBeTruthy()

    await page.goto('/menu-design')
    await expect(card(first)).toContainText('ברירת מחדל')
    await card(second).getByRole('button', { name: 'קביעה כברירת מחדל' }).click()
    await expect(card(second).locator('.design-card__default')).toHaveText('ברירת מחדל')
    await expect(card(first).locator('.design-card__default')).toHaveCount(0)
    await card(second).getByRole('button', { name: 'שכפול' }).click()
    await expect(card(`${second} (עותק)`)).toBeVisible()
    await page.screenshot({ path: 'screens/765-4.png' })
  } finally {
    if (before) {
      // Give the default back, then remove only what this run created.
      const previous = business.menuDesign?.defaultDesignId
      if (previous && before.includes(previous)) await setDefault(previous)
      for (const { _id } of (await list()).filter((design) => !before!.includes(design._id))) {
        await request.delete(`${API}/api/v1/data/menuDesigns/${_id}?permanent=true`, { headers })
      }
    }
    await put(DEFAULTS)
  }
})
