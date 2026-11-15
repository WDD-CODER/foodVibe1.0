import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

const draft = {
  nameHebrew: 'E2E 600 מרק',
  recipe_type: 'dish',
  yield_amount: 4,
  yield_unit: 'portion',
  ingredients: [{ name: 'מים', amount: 100, unit: 'gram' }],
  steps: ['מבשלים']
}

test('600-2: the platform admin moves a candidate into the shared pool and back out', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const shotKey = `e2e600-${Date.now()}`
  let sharedId: string | null = null
  try {
    // Setup: the QA business opts in and has one saved (confirmed) example.
    await request.put(`${API}/api/v1/business/share-ai-examples`, { headers, data: { share: true } })
    await request.post(`${API}/api/v1/ai/shots`, {
      headers,
      data: { prompt: 'E2E 600 מרק', draft, status: 'pending', source: 'text', shotKey }
    })
    await request.post(`${API}/api/v1/ai/shots/confirm`, { headers, data: { shotKey, draft, recipeId: 'e2e-600' } })

    await page.goto('/platform')
    const section = page.locator('app-platform-ai-shots')
    await expect(section).toContainText('דוגמאות AI למתכונים')
    await expect(section.getByRole('heading', { name: 'מאגר משותף' })).toBeVisible()
    await expect(section.getByRole('heading', { name: 'מועמדים' })).toBeVisible()

    const candidate = section.locator('[data-testid="ai-shots-candidates"] li', { hasText: 'E2E 600 מרק' })
    await candidate.getByRole('button', { name: 'הוספה למאגר' }).click()
    const shared = section.locator('[data-testid="ai-shots-shared"] li', { hasText: 'E2E 600 מרק' })
    await expect(shared.getByRole('button', { name: 'הסרה מהמאגר' })).toBeVisible()
    await page.screenshot({ path: 'screens/600-2.png' })
  } finally {
    const res = await request.get(`${API}/api/v1/admin/ai-shots`, { headers })
    if (res.ok()) {
      const body = (await res.json()) as { shared: { _id: string; nameHebrew: string }[] }
      sharedId = body.shared.find((r) => r.nameHebrew === draft.nameHebrew)?._id ?? null
    }
    if (sharedId) await request.delete(`${API}/api/v1/admin/ai-shots/shared/${sharedId}`, { headers })
    await request.put(`${API}/api/v1/business/share-ai-examples`, { headers, data: { share: false } })
  }
})
