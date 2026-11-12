import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('547-1: the owner adds a client and sees the row', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/clients')
  await page.getByRole('button', { name: 'הוסף לקוח חדש' }).click()
  const form = page.locator('app-client-form')
  await form.getByRole('textbox').first().fill('QA לקוח 547')
  await form.locator('input[type="tel"]').fill('0501234567')
  await form.getByRole('button', { name: 'שמור' }).click()
  await expect(page.locator('.client-grid-row', { hasText: 'QA לקוח 547' }).first()).toBeVisible()
  await page.screenshot({ path: 'screens/547-1.png' })
})
