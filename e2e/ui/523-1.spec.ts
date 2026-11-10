import { test, expect, type Page } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const card = (page: Page) => page.locator('app-logistics-item-manager')

test('523-1: the logistics card shows a shared question with a lock', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/metadata-manager')
  await expect(card(page).getByRole('heading', { name: 'שאלות לוגיסטיקה' })).toBeVisible()
  const row = card(page).locator('.logistics-item', { hasText: 'יש מטבח במקום?' })
  await expect(row).toBeVisible()
  await expect(row.locator('.c-chip--tag lucide-icon[name="lock"]')).toBeVisible()
  await expect(row.locator('.c-chip__remove')).toHaveCount(0)
  await row.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'screens/523-1.png' })
})
