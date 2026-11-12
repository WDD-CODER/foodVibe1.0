import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const QUESTION = 'האם יש חניה?'

test('554-1: the owner adds a fact and sees it approved in the list', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  try {
    await page.goto('/frontdesk/knowledge')
    await page.getByTestId('knowledge-add').click()
    await page.locator('app-modal-shell app-custom-select').first().click()
    await page.getByText('מדיניות', { exact: true }).last().click()
    await page.locator('#knowledge-question').fill(QUESTION)
    await page.locator('#knowledge-answer').fill('יש חניה חינם מאחורי המבנה')
    await page.getByTestId('knowledge-save').click()

    const row = page.getByTestId('knowledge-row').filter({ hasText: QUESTION })
    await expect(row).toBeVisible()
    await expect(row).toContainText('מאושר')
    await page.screenshot({ path: 'screens/554-1.png' })
  } finally {
    const res = await request.get(`${API}/api/v1/data/knowledgeItems`, { headers })
    if (res.ok()) {
      const body = await res.json()
      const list: { _id: string; question: string }[] = Array.isArray(body) ? body : (body.data ?? [])
      for (const i of list.filter((x) => x.question === QUESTION)) {
        await request.delete(`${API}/api/v1/data/knowledgeItems/${i._id}?permanent=true`, { headers })
      }
    }
  }
})
