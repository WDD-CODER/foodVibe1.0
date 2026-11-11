import { test, expect, type Page } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const panel = (page: Page) => page.locator('app-event-logistics-panel')
const rowOf = (page: Page, label: string) => panel(page).locator('.logistics-row', { hasText: label })

test('579-2: one needed toggle opens exactly two providers, "עלינו" selected', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/menu-intelligence/' + id)
    await panel(page).locator('.logistics-toggle').click()
    const row = rowOf(page, 'יש מטבח במקום?')
    await expect(row).toBeVisible()
    await expect(row.getByText('לא נבדק', { exact: true })).toHaveCount(0)
    await expect(row.getByText('ללקוח', { exact: true })).toHaveCount(0)
    await row.getByText('נדרש', { exact: true }).click()
    await expect(row.locator('.logistics-payer label')).toHaveCount(2)
    await expect(row.getByText('עלינו', { exact: true })).toBeVisible()
    await expect(row.getByText('באחריות הלקוח', { exact: true })).toBeVisible()
    await expect(row.getByRole('radio', { name: 'עלינו' })).toBeChecked()
    await page.screenshot({ path: 'screens/579-2.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
