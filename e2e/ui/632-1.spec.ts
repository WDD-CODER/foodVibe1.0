import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('632-1: the owner opens the access tab and sees that no consultant has access', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/settings')
  await page.getByRole('tab', { name: 'גישת יועצים' }).click()
  await expect(page.getByText('לאף יועץ אין כרגע גישה לעסק')).toBeVisible()
  await page.screenshot({ path: 'screens/632-1.png' })
})
