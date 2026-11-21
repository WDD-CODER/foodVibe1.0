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

test('623-3: saving the kept answer shows the saved toast', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await fakeExtract(page, {
      draftId: 'd1',
      answers: [{ itemKey: 'קירור קיים במקום (מקרר/חדר קירור)', phase: 'intake', section: 'infrastructure', status: 'needed' }],
      conflicts: [],
      adhoc: [],
      unanswered: []
    })
    await page.goto('/menu-intelligence/' + id)
    await openNotes(page)
    await panel(page).locator('app-voice-note textarea').fill('יש קירור במקום')
    await panel(page).getByRole('button', { name: 'הצע תשובות' }).click()
    await panel(page).getByRole('button', { name: 'שמור תשובות' }).click()
    await expect(page.getByText('התשובות נשמרו')).toBeVisible()
    await page.screenshot({ path: 'screens/623-3.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
