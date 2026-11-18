import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const apiBase = () => (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('624-1: an ad-hoc item needed and ours shows on the loading list', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    const saved = await request.put(`${apiBase()}/api/v1/events/${id}/logistics`, {
      headers: { authorization: `Bearer ${session.token}` },
      data: {
        answers: [
          { itemKey: 'adhoc:624', label: 'מנגל פחמים', phase: 'site_visit', section: 'infrastructure', status: 'needed', payer: 'ours' }
        ]
      }
    })
    expect(saved.ok()).toBeTruthy()
    await page.goto('/menu-intelligence/' + id)
    await page.locator('app-event-logistics-panel .logistics-toggle').click()
    await page.getByRole('button', { name: 'רשימת העמסה' }).click()
    await expect(page.locator('app-loading-list').getByText('מנגל פחמים')).toBeVisible()
    await page.screenshot({ path: 'screens/624-1.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
