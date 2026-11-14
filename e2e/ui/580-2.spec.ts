import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('580-2: the per-user limit reads as limit reached', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/ai/generate-menu', (r) =>
    r.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Too many AI requests, please try again later' })
    })
  )
  await page.goto('/menu-library')
  await page.getByRole('button', { name: 'פעולות מהירות' }).click()
  await page.getByRole('button', { name: 'צור עם AI' }).click()
  await page.locator('.ai-menu-textarea').fill('אירוע ל-50 אורחים')
  await page.getByRole('button', { name: 'צור תפריט' }).click()
  await expect(page.getByText('הגעת למגבלת השימוש ב-AI.')).toBeVisible()
  await expect(page.getByText('עמוס')).toHaveCount(0)
  await page.screenshot({ path: 'screens/580-2.png' })
})
