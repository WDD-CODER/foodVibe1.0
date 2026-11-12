import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('580-1: a menu answer with no dishes says why', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/ai/generate-menu', (r) =>
    r.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Gemini returned invalid menu draft', code: 'no_sections' })
    })
  )
  await page.goto('/menu-library')
  await page.getByRole('button', { name: 'פעולות מהירות' }).click()
  await page.getByRole('button', { name: 'צור עם AI' }).click()
  await page.locator('.ai-menu-textarea').fill('אירוע ל-50 אורחים')
  await page.getByRole('button', { name: 'צור תפריט' }).click()
  await expect(page.getByText('לא נמצאו מנות לתפריט. כתבו אילו מנות להגיש.')).toBeVisible()
  await page.screenshot({ path: 'screens/580-1.png' })
})
