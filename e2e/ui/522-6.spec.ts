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


test('522-6: finishing a phase with open items asks first', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/menu-intelligence/' + id)
    await openCard(page)
    await panel(page).getByRole('button', { name: 'סיימתי את השלב' }).click()
    await expect(page.getByText(/נשארו פריטים שלא נבדקו/)).toBeVisible()
    await page.screenshot({ path: 'screens/522-6.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
