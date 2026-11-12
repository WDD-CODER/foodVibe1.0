import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('546-1: a new client added from the inquiry is selected and the inquiry saves', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const name = 'E2E לקוח ' + Date.now()
  const phone = '05' + String(Date.now()).slice(-8)
  await page.goto('/menu-library')
  await page.locator('.header-inquiry-btn').click()
  await page.locator('#inquiry-client').fill(name)
  await page.getByRole('option', { name: /^הוסף/ }).click()
  await page.locator('#client-form-phone').fill(phone)
  await page.getByRole('button', { name: 'שמור', exact: true }).click()
  await expect(page.locator('.client-picker-picked__name')).toHaveText(name)
  await expect(page.locator('.client-picker-picked button')).toBeVisible()
  await page.getByRole('button', { name: 'שמור', exact: true }).click()
  await expect(page.getByText('הפנייה נשמרה')).toBeVisible()
  await page.screenshot({ path: 'screens/546-1.png' })
  // Clean up the client and its inquiry.
  const clients = await request.get(`${API}/api/v1/data/clients`, { headers })
  const list = (await clients.json()) as { _id: string; name: string }[]
  const mine = (Array.isArray(list) ? list : []).find((c) => c.name === name)
  if (mine) {
    const events = await request.get(`${API}/api/v1/data/menuEvents`, { headers })
    const evList = (await events.json()) as { _id: string; clientId?: string }[]
    for (const e of (Array.isArray(evList) ? evList : []).filter((e) => e.clientId === mine._id))
      await request.delete(`${API}/api/v1/data/menuEvents/${e._id}?permanent=true`, { headers })
    await request.delete(`${API}/api/v1/data/clients/${mine._id}?permanent=true`, { headers })
  }
})
