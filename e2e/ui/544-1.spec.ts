import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('544-1: a deleted client is listed under "לקוחות" in Trash and comes back', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const name = 'E2E לקוח ' + Date.now()
  const phone = '05' + String(Date.now()).slice(-8)
  const created = await request.post(`${API}/api/v1/data/clients`, { headers, data: { name, phone } })
  expect(created.ok()).toBeTruthy()
  const id = (await created.json())._id as string
  try {
    expect((await request.delete(`${API}/api/v1/data/clients/${id}`, { headers })).ok()).toBeTruthy()

    await page.goto('/trash')
    const section = page.locator('section.trash-section', { has: page.locator('h2', { hasText: /^\s*לקוחות\s*$/ }) })
    const item = section.locator('li.trash-item', { hasText: name })
    await expect(item.locator('.trash-item-name')).toHaveText(name)
    await page.screenshot({ path: 'screens/544-1.png' })

    await item.getByRole('button', { name: 'שחזר מהאשפה' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'שחזר מהאשפה' }).click()
    await expect(item).toHaveCount(0)
    const live = await request.get(`${API}/api/v1/data/clients/${id}`, { headers })
    expect(live.ok()).toBeTruthy()
    expect((await live.json()).name).toBe(name)
  } finally {
    await request.delete(`${API}/api/v1/data/clients/${id}?permanent=true`, { headers })
  }
})
