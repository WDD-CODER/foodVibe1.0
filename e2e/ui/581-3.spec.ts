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

test('581-3: a pencil with an unsaved question asks first', async ({ page, context, request }) => {
  const session = await signInQa(context)
  await cleanup(request, session)
  try {
    await createOwn(request, session, 'בדיקה 581')
    await page.goto('/dashboard?tab=metadata')
    await expect(card(page)).toBeVisible()
    await card(page).locator('#logistics-item-text').fill('טיוטה 581')
    await card(page).locator('.logistics-item', { hasText: 'בדיקה 581' }).getByRole('button', { name: 'עריכה' }).click()
    await expect(page.getByText('בטופס יש שאלה שלא נשמרה')).toBeVisible()
    await page.screenshot({ path: 'screens/581-3.png' })
  } finally {
    await cleanup(request, session)
  }
})
