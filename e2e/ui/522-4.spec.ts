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


test('522-4: an answer survives a reload', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/menu-intelligence/' + id)
    await openCard(page, 'פגישת ספקים')
    const row = rowOf(page, "צ'ילרים להבאה")
    const saved = page.waitForResponse((r) => r.url().includes('/logistics') && r.request().method() === 'PUT')
    await row.getByText('נדרש', { exact: true }).click()
    await saved
    const counter = row.locator('app-counter input')
    const savedQty = page.waitForResponse((r) => r.url().includes('/logistics') && r.request().method() === 'PUT')
    await counter.fill('2')
    await counter.press('Enter')
    await savedQty
    await page.reload()
    await openCard(page, 'פגישת ספקים')
    const again = rowOf(page, "צ'ילרים להבאה")
    await expect(again.locator('input[type=radio]:checked + span')).toHaveText(/^נדרש$/)
    await expect(again.locator('app-counter input')).toHaveValue('2')
    await page.screenshot({ path: 'screens/522-4.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
