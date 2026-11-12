import { test, expect, type Page } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const KEY = 'שאלה חדשה 579'
const panel = (page: Page) => page.locator('app-event-logistics-panel')

test('579-3: a question added after an event is not on it, but is on a later event', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const ids: string[] = []
  let termId: string | null = null
  try {
    ids.push(await createQaEvent(request, session))
    await new Promise((r) => setTimeout(r, 50))
    const created = await request.post(`${API}/api/v1/data/taxonomyTerms`, {
      headers,
      data: { kind: 'logisticsItem', key: KEY, sortOrder: 9999, phase: 'intake', section: 'space', answerType: 'status' }
    })
    expect(created.ok()).toBeTruthy()
    termId = (await created.json())._id as string
    await new Promise((r) => setTimeout(r, 50))
    ids.push(await createQaEvent(request, session))

    await page.goto('/menu-intelligence/' + ids[0])
    await panel(page).locator('.logistics-toggle').click()
    await expect(panel(page).locator('.logistics-row', { hasText: 'יש מטבח במקום?' })).toBeVisible()
    await expect(panel(page).getByText(KEY)).toHaveCount(0)

    await page.goto('/menu-intelligence/' + ids[1])
    await panel(page).locator('.logistics-toggle').click()
    await expect(panel(page).getByText(KEY)).toBeVisible()
    await page.screenshot({ path: 'screens/579-3.png' })
  } finally {
    if (termId) await request.delete(`${API}/api/v1/data/taxonomyTerms/${termId}`, { headers })
    for (const id of ids) await deleteQaEvent(request, session, id)
  }
})
