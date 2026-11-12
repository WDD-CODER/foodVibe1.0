import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('556-1: the owner picks catering, types a name and a link name, saves and sees the toast', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/frontdesk/onboarding')
  await page.locator('#ob-type').click()
  await page.getByRole('option', { name: 'קייטרינג ואירועים' }).click()
  const display = page.locator('#ob-display_name')
  if (!(await display.inputValue())) await display.fill('קייטרינג בדיקה')
  const slug = page.locator('#ob-slug')
  if (!(await slug.inputValue())) await slug.fill(`qa-${Date.now().toString(36)}`)
  await page.getByTestId('onboarding-save').click()
  await expect(page.getByText('הטופס נשמר').first()).toBeVisible()
  await page.screenshot({ path: 'screens/556-1.png' })
})
