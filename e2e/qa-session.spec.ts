import { test, expect } from '@playwright/test'
import { signInQa } from './helpers/qa-session'

test('signInQa shows the QA user in the header chip', async ({ page, context }) => {
  const session = await signInQa(context)
  await page.goto('/menu-library')
  await expect(page.locator('.user-chip')).toContainText(session.user.name)
  await page.screenshot({ path: 'screens/517-1.png' })
})
