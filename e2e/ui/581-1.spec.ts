import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { signInQa, type QaSession } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const NAMES = ['בדיקה 581', 'טיוטה 581', 'סעיף 581']
const card = (page: Page) => page.locator('app-logistics-item-manager')

/** Deletes every own logisticsItem / logisticsSection term this card created (also removed ones). */
async function cleanup(request: APIRequestContext, session: QaSession): Promise<void> {
  const headers = { authorization: `Bearer ${session.token}` }
  const res = await request.get(`${API}/api/v1/data/taxonomyTerms`, { headers })
  if (!res.ok()) return
  const body = await res.json()
  const terms: { _id: string; kind: string; key: string; userId?: string }[] = Array.isArray(body)
    ? body
    : (body.data ?? body.items ?? [])
  for (const t of terms.filter((x) => NAMES.includes(x.key) && x.userId !== '__master__')) {
    await request.delete(`${API}/api/v1/data/taxonomyTerms/${t._id}`, { headers })
  }
}

async function createOwn(request: APIRequestContext, session: QaSession, key: string): Promise<void> {
  const created = await request.post(`${API}/api/v1/data/taxonomyTerms`, {
    headers: { authorization: `Bearer ${session.token}` },
    data: { kind: 'logisticsItem', key, sortOrder: 9999, phase: 'intake', section: 'other', answerType: 'status' }
  })
  expect(created.ok()).toBeTruthy()
}

test('581-1: the pencil edits an own question in place', async ({ page, context, request }) => {
  const session = await signInQa(context)
  await cleanup(request, session)
  try {
    await createOwn(request, session, 'בדיקה 581')
    await page.goto('/dashboard?tab=metadata')
    await expect(card(page)).toBeVisible()
    const row = card(page).locator('.logistics-item', { hasText: 'בדיקה 581' })
    await row.getByRole('button', { name: 'עריכה' }).click()
    await expect(card(page).locator('#logistics-item-text')).toHaveValue('בדיקה 581')
    await card(page).locator('.logistics-add-section').click()
    await page.getByRole('option', { name: 'צוות', exact: true }).click()
    await card(page).locator('.logistics-add-submit').click()
    const moved = card(page).locator('[data-section="staff"] .logistics-item', { hasText: 'בדיקה 581' })
    await expect(moved).toHaveCount(1)
    await expect(card(page).locator('.logistics-item', { hasText: 'בדיקה 581' })).toHaveCount(1)
    await moved.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'screens/581-1.png' })
  } finally {
    await cleanup(request, session)
  }
})
