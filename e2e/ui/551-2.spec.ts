import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('551-2: the stage bar client chip opens the client profile', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const stamp = Date.now()
  const name = 'צ׳יפ בדיקה ' + stamp
  const res = await request.post(`${API}/api/v1/data/clients`, { headers, data: { name, phone: '05' + String(stamp).slice(-8) } })
  expect(res.ok()).toBeTruthy()
  const clientId = (await res.json())._id as string
  const eventId = await createQaEvent(request, session, { clientId, clientName: name })
  try {
    await page.goto('/menu-intelligence/' + eventId)
    await page.locator('.client-row a.client-chip').click()
    await expect(page).toHaveURL(new RegExp('/clients/' + clientId))
    await expect(page.getByTestId('client-name')).toHaveText(name)
    await page.screenshot({ path: 'screens/551-2.png' })
  } finally {
    await deleteQaEvent(request, session, eventId)
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers })
  }
})
