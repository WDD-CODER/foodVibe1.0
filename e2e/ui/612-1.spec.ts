import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

const aiDraft = {
  nameHebrew: 'E2E 612 מרק',
  recipe_type: 'preparation',
  yield_amount: 1000,
  yield_unit: 'gram',
  ingredients: [{ name: 'מים', amount: 100, unit: 'gram' }],
  steps: ['מבשלים']
}
// The cook turned the 1000 gram preparation into a dish of 10 portions before saving.
const savedDraft = { ...aiDraft, recipe_type: 'dish', yield_amount: 10, yield_unit: 'portion' }

test('612-1: the AI examples section explains itself and scores a changed recipe below 100%', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const shotKey = `e2e612-${Date.now()}`
  // Setup: the QA business is not private, so its confirmed example is a candidate.
  await request.post(`${API}/api/v1/ai/shots`, {
    headers,
    data: { prompt: 'E2E 612 מרק', draft: aiDraft, status: 'pending', source: 'text', shotKey }
  })
  await request.post(`${API}/api/v1/ai/shots/confirm`, {
    headers,
    data: { shotKey, draft: savedDraft, recipeId: 'e2e-612' }
  })

  await page.goto('/platform')
  const section = page.locator('app-platform-ai-shots')
  await expect(section).toContainText('דוגמאות AI למתכונים')
  await expect(section.getByTestId('ai-shots-desc')).toContainText('כאן מופיעות דוגמאות')

  const candidate = section.locator('[data-testid="ai-shots-candidates"] li', { hasText: 'E2E 612 מרק' })
  const meta = candidate.locator('.ai-shot__meta')
  await expect(meta).toContainText('דיוק ה-AI:')
  const pct = Number(/דיוק ה-AI:\s*(\d+)%/.exec((await meta.textContent()) ?? '')?.[1])
  expect(pct).toBeLessThan(100)
  await page.screenshot({ path: 'screens/612-1.png' })
})
