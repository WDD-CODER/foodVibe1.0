import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('620-3: the modules and AI action of a business row opens its dialog', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/platform')
  await page.locator('[data-testid="biz-edit"]').first().click({ force: true })
  const dialog = page.locator('[data-testid="biz-dialog"]')
  await expect(dialog).toBeVisible()
  await expect(page.getByText('מודולים ו-AI לעסק')).toBeVisible()
  await page.screenshot({ path: 'screens/620-3.png' })
  await page.locator('[data-testid="biz-cancel"]').click()
  await expect(dialog).toHaveCount(0)
})
