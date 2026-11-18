import { test, expect, type Page } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const panel = (page: Page) => page.locator('app-event-logistics-panel')

async function openNotes(page: Page): Promise<void> {
  await panel(page).locator('.logistics-toggle').click()
  await panel(page).getByRole('button', { name: 'מילוי מהערות' }).click()
}

async function fakeExtract(page: Page, body: unknown): Promise<void> {
  await page.route('**/ai/logistics/extract', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  )
  await page.route('**/ai/logistics/extract/*/confirm', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  )
}

test('623-1: pasted notes become suggested answers and open questions', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await fakeExtract(page, {
      draftId: 'd1',
      answers: [{ itemKey: 'קירור קיים במקום (מקרר/חדר קירור)', phase: 'intake', section: 'infrastructure', status: 'needed' }],
      conflicts: [],
      adhoc: [],
      unanswered: ['יש מטבח במקום?']
    })
    await page.goto('/menu-intelligence/' + id)
    await openNotes(page)
    await panel(page).locator('app-voice-note textarea').fill("יש קירור במקום, צריך להביא 2 צ'ילרים, גנרטור לא צריך")
    await panel(page).getByRole('button', { name: 'הצע תשובות' }).click()
    await expect(panel(page).getByText('תשובות מוצעות')).toBeVisible()
    await expect(panel(page).getByText('עוד לבדוק במקום')).toBeVisible()
    await page.screenshot({ path: 'screens/623-1.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
