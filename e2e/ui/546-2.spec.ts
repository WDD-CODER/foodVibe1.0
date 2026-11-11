import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('546-2: the stage bar switches the event to another client through the shared picker', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const stamp = Date.now()
  const make = async (name: string, phone: string) => {
    const res = await request.post(`${API}/api/v1/data/clients`, { headers, data: { name, phone } })
    expect(res.ok()).toBeTruthy()
    return (await res.json())._id as string
  }
  const nameA = 'אאא בדיקה ' + stamp
  const nameB = 'בבב בדיקה ' + stamp
  const idA = await make(nameA, '05' + String(stamp).slice(-8))
  const idB = await make(nameB, '05' + String(stamp + 1).slice(-8))
  const eventId = await createQaEvent(request, session, { clientId: idA, clientName: nameA })
  try {
    await page.goto('/menu-intelligence/' + eventId)
    await page.getByRole('button', { name: 'החלף לקוח' }).click()
    await page.locator('#stage-client-pick').fill('בב')
    await page.getByRole('option', { name: new RegExp(nameB) }).click()
    await expect(page.locator('.client-row .client-chip')).toHaveText(nameB)
    await page.screenshot({ path: 'screens/546-2.png' })
  } finally {
    await deleteQaEvent(request, session, eventId)
    for (const id of [idA, idB]) await request.delete(`${API}/api/v1/data/clients/${id}?permanent=true`, { headers })
  }
})
