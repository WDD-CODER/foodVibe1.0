import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('545-1: adding a client with an existing phone selects the existing client and says so', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const name = 'E2E קיים ' + Date.now()
  const phone = '05' + String(Date.now()).slice(-8)
  const created = await request.post(`${API}/api/v1/data/clients`, { headers, data: { name, phone } })
  expect(created.ok()).toBeTruthy()
  const id = (await created.json())._id as string
  try {
    await page.goto('/menu-library')
    await page.locator('.header-inquiry-btn').click()
    await page.locator('#inquiry-client').fill('E2E חדש')
    await page.getByRole('option', { name: /^הוסף/ }).click()
    await page.locator('#inquiry-name').fill('E2E חדש ' + Date.now())
    await page.locator('#inquiry-phone').fill(phone)
    await page.getByRole('button', { name: 'שמור', exact: true }).click()
    await expect(page.getByText('כבר יש לקוח עם מספר הטלפון הזה — הוא נבחר')).toBeVisible()
    await expect(page.locator('.inquiry-client-picked__name')).toHaveText(name)
    await page.screenshot({ path: 'screens/545-1.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/clients/${id}?permanent=true`, { headers })
  }
})
