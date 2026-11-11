import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { signInQa, type QaSession } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const NAME = 'בדיקה E2E'
const card = (page: Page) => page.locator('app-logistics-item-manager')

/** Deletes every own `logisticsItem` term named NAME (left over from this run or an earlier one). */
async function cleanup(request: APIRequestContext, session: QaSession): Promise<void> {
  const headers = { authorization: `Bearer ${session.token}` }
  const res = await request.get(`${API}/api/v1/data/taxonomyTerms`, { headers })
  if (!res.ok()) return
  const body = await res.json()
  const terms: { _id: string; kind: string; key: string; userId?: string }[] = Array.isArray(body)
    ? body
    : (body.data ?? body.items ?? [])
  for (const t of terms.filter((x) => x.kind === 'logisticsItem' && x.key === NAME && x.userId !== '__master__')) {
    await request.delete(`${API}/api/v1/data/taxonomyTerms/${t._id}`, { headers })
  }
}

test('523-3: removing an own question and confirming takes it off the list', async ({ page, context, request }) => {
  const session = await signInQa(context)
  await cleanup(request, session)
  try {
    // The question card 523-2 adds, created here through the API so this card runs on its own.
    const created = await request.post(`${API}/api/v1/data/taxonomyTerms`, {
      headers: { authorization: `Bearer ${session.token}` },
      data: {
        kind: 'logisticsItem',
        key: NAME,
        sortOrder: 9999,
        phase: 'site_visit',
        section: 'infrastructure',
        answerType: 'status'
      }
    })
    expect(created.ok()).toBeTruthy()

    await page.goto('/dashboard?tab=metadata')
    await card(page).getByRole('tab', { name: 'פגישת ספקים' }).click()
    const row = card(page).locator('.logistics-item', { hasText: NAME })
    await expect(row).toBeVisible()
    await row.locator('.c-chip__remove').click()
    await page.locator('.c-modal-actions .c-btn-primary').last().click()

    await expect(card(page).locator('.logistics-item', { hasText: NAME })).toHaveCount(0)
    await card(page).locator('[data-section="infrastructure"]').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'screens/523-3.png' })
  } finally {
    await cleanup(request, session)
  }
})
