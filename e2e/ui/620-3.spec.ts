import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('620-3: the modules and AI action of a business row opens its dialog', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/platform')
  const row = page.getByTestId('biz-row').first()
  await expect(row).toBeVisible()
  await row.getByTestId('biz-edit').click()
  const dialog = page.getByTestId('biz-dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByText('מודולים ו-AI לעסק')).toBeVisible()
  await page.screenshot({ path: 'screens/620-3.png' })
  await page.getByTestId('biz-cancel').click()
  await expect(dialog).toHaveCount(0)
})
