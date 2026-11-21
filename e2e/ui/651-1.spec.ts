import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const DEFAULTS = ['events', 'event_logistics', 'frontdesk', 'ai_create']

// Plan 651: on the count page every row is one line high and the counter has the desktop size; with consultant_diag
// the main menu shows «אבחון» at 375 px and at 1280 px.
test('651-1: the count rows are one line, the counter keeps its size, the diagnosis entry is visible', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const business = await (await request.get(`${API}/api/v1/business`, { headers })).json()
  const put = (modules: string[]) =>
    request.put(`${API}/api/v1/admin/businesses/${business._id}/platform`, { headers, data: { modules, reason: 'e2e 651' } })
  try {
    await put([...DEFAULTS, 'consultant_diag'])

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/inventory/count')
    const counter = page.locator('app-counter .counter-grid').first()
    await expect(counter).toBeVisible()
    const desktopHeight = (await counter.boundingBox())!.height
    await expect(page.locator('app-header').getByRole('link', { name: 'אבחון' })).toBeVisible()

    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/inventory/count')
    await expect(counter).toBeVisible()
    expect((await counter.boundingBox())!.height).toBe(desktopHeight)
    const cells = page.locator('[data-testid="stk-row"]').first().locator('.c-list-body-cell')
    const boxes = await cells.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
    expect(new Set(boxes.map((top) => Math.round(top))).size).toBe(1)
    await expect(page.locator('.bottom-nav').getByRole('link', { name: 'אבחון' })).toBeVisible()
    await page.screenshot({ path: 'screens/651-1.png' })
  } finally {
    await put(DEFAULTS)
  }
})
