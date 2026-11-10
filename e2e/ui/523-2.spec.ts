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

async function choose(page: Page, select: string, label: string): Promise<void> {
  await card(page).locator(select).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

test('523-2: adding an own question shows it under its section with a remove control', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  await cleanup(request, session)
  try {
    await page.goto('/metadata-manager')
    await card(page).getByRole('tab', { name: 'פגישת ספקים' }).click()
    await card(page).locator('#logistics-item-text').fill(NAME)
    await choose(page, '.logistics-add-phase', 'פגישת ספקים')
    await choose(page, '.logistics-add-section', 'תשתיות')
    await choose(page, '.logistics-add-type', 'כן/לא')
    await card(page).locator('.logistics-add-submit').click()

    const row = card(page).locator('[data-section="infrastructure"] .logistics-item', { hasText: NAME })
    await expect(row).toBeVisible()
    await expect(row.locator('.c-chip--removable .c-chip__remove')).toBeVisible()
    await row.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'screens/523-2.png' })
  } finally {
    await cleanup(request, session)
  }
})
