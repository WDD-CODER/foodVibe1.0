import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('556-2: the owner sees the front desk checklist card with a done-of-total line on the dashboard', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard')
  const card = page.getByTestId('frontdesk-setup-card')
  await expect(card.getByText('הכנת לקוחות והזמנות')).toBeVisible()
  await expect(card.getByTestId('frontdesk-setup-progress')).toHaveText(/\d+ מתוך \d+/)
  await page.screenshot({ path: 'screens/556-2.png' })
})
