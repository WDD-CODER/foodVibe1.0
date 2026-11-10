import { test, expect, type Page } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const panel = (page: Page) => page.locator('app-event-logistics-panel')

/** Opens the collapsed "לוגיסטיקה" card (and a tab when given). */
async function openCard(page: Page, tab?: string): Promise<void> {
  await panel(page).locator('.logistics-toggle').click()
  if (tab) await panel(page).getByRole('tab', { name: tab }).click()
}

async function chooseEnvironment(page: Page, label: string): Promise<void> {
  await panel(page).locator('.logistics-profile app-custom-select').click()
  await page.getByText(label, { exact: true }).last().click()
}

const rowOf = (page: Page, label: string) => panel(page).locator('.logistics-row', { hasText: label })


test('522-1: card starts closed and opens on one tap', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/menu-intelligence/' + id)
    await expect(panel(page)).toBeVisible()
    await expect(page.getByText('יש מטבח במקום?')).toHaveCount(0)
    await openCard(page)
    await expect(panel(page).getByRole('tab', { name: /שיחה ראשונה/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('יש מטבח במקום?')).toBeVisible()
    await page.screenshot({ path: 'screens/522-1.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
