import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('551-1: a click on the client row opens the profile with the event in the timeline', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const stamp = Date.now()
  const name = 'פרופיל בדיקה ' + stamp
  const res = await request.post(`${API}/api/v1/data/clients`, { headers, data: { name, phone: '05' + String(stamp).slice(-8) } })
  expect(res.ok()).toBeTruthy()
  const clientId = (await res.json())._id as string
  const eventName = 'אירוע פרופיל ' + stamp
  let eventId: string | undefined
  try {
    eventId = await createQaEvent(request, session, { clientId, clientName: name, name: eventName })
    await page.goto('/clients')
    await page.locator('.client-grid-row', { hasText: name }).first().click()
    await expect(page).toHaveURL(new RegExp('/clients/' + clientId))
    await expect(page.getByTestId('client-timeline')).toContainText(eventName)
    await page.screenshot({ path: 'screens/551-1.png' })
  } finally {
    if (eventId) await deleteQaEvent(request, session, eventId)
    await request.delete(`${API}/api/v1/data/clients/${clientId}?permanent=true`, { headers })
  }
})
