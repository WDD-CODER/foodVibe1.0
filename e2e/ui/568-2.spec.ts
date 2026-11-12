import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1280, height: 900 } })

test('568-2: the dashboard performance card links to /report', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'לדוח המלא' }).click({ timeout: 10000 })
  await expect(page).toHaveURL(/\/report/)
  await page.screenshot({ path: 'screens/568-2.png' })
})
