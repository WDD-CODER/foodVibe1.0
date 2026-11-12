import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('580-3: the AI window shows the uses left in one short line', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/ai/usage', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ budget: 20, used: 13, remaining: 7, count: 13, models: [] })
    })
  )
  await page.goto('/menu-library')
  await page.getByRole('button', { name: 'פעולות מהירות' }).click()
  await page.getByRole('button', { name: 'צור עם AI' }).click()
  await expect(page.getByText('נותרו 7 שימושים היום')).toBeVisible()
  await expect(page.getByText('תקציב AI יומי')).toHaveCount(0)
  await page.screenshot({ path: 'screens/580-3.png' })
})
