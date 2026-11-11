import { test, expect, type Page } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const panel = (page: Page) => page.locator('app-event-logistics-panel')
const rowOf = (page: Page, label: string) => panel(page).locator('.logistics-row', { hasText: label })

test('579-1: hide a question on one event and bring it back', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/menu-intelligence/' + id)
    await panel(page).locator('.logistics-toggle').click()
    const row = rowOf(page, 'יש מטבח במקום?')
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'הסר מהאירוע הזה' }).click()
    await expect(row).toHaveCount(0)
    const chip = panel(page).getByRole('button', { name: /1\s*מוסתרות/ })
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(row).toBeVisible()
    await page.screenshot({ path: 'screens/579-1.png' })
    await row.getByRole('button', { name: 'החזר לאירוע' }).click()
    await expect(rowOf(page, 'יש מטבח במקום?').getByRole('button', { name: 'הסר מהאירוע הזה' })).toBeVisible()
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
