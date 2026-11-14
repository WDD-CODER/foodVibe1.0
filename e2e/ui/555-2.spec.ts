import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const kind = (minutes?: number) => ({
  enabled: true,
  questions: [],
  rules: {},
  ...(minutes ? { defaultDurationMinutes: minutes } : {}),
  expireAfterHours: 24
})

let slug = ''
let token = ''

test.beforeAll(async ({ request, browser }) => {
  const context = await browser.newContext()
  const session = await signInQa(context)
  await context.close()
  const headers = { authorization: `Bearer ${session.token}` }
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers })).json()
  let profile = Array.isArray(list) && list.length ? list[0] : null
  if (!profile) {
    const res = await request.post(`${API}/api/v1/data/frontDeskProfiles`, {
      headers,
      data: {
        businessType: 'other',
        slug: 'e2e-555-qa',
        displayName: 'E2E',
        hours: [],
        requestKinds: { table: kind(120), tasting: kind(60) },
        assistant: { level: 0, tone: 'warm' }
      }
    })
    expect(res.ok()).toBeTruthy()
    profile = await res.json()
  }
  slug = profile.slug
  execFileSync('node', ['server/scripts/set-front-desk-status.js', `--slug=${slug}`, '--status=pilot'], {
    cwd: resolve(__dirname, '../..')
  })
  const enabled = Object.keys(profile.requestKinds ?? {}).filter((k) => profile.requestKinds[k].enabled)
  const sent = await request.post(`${API}/api/v1/public/${slug}/requests`, {
    data: {
      kind: enabled.includes('tasting') ? 'tasting' : enabled[0],
      guestName: 'אורח בדיקה',
      guestPhone: '0501234568',
      wanted: { date: '2031-06-15', time: '19:00', partySize: 4 },
      answers: [],
      consentTerms: true
    }
  })
  expect(sent.status()).toBe(201)
  token = (await sent.json()).token
})

test('555-2: the status link shows the waiting status; cancelling asks first and shows cancelled', async ({ page }) => {
  await page.goto(`/book/${slug}/r/${token}`)
  await expect(page.getByText('ממתינה לאישור')).toBeVisible()
  await page.getByRole('button', { name: 'ביטול הבקשה' }).click()
  await expect(page.getByText('לבטל את הבקשה?')).toBeVisible()
  await page.locator('app-confirm-modal .c-btn-primary').click()
  await expect(page.getByText('הבקשה בוטלה')).toBeVisible()
  await page.screenshot({ path: 'screens/555-2.png' })
})
