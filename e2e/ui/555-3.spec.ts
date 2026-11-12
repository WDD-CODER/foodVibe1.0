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

let ownerHeaders: Record<string, string> = {}
let requestId = ''

test.beforeAll(async ({ request, browser }) => {
  const context = await browser.newContext()
  const session = await signInQa(context)
  await context.close()
  ownerHeaders = { authorization: `Bearer ${session.token}` }
  const list = await (await request.get(`${API}/api/v1/data/frontDeskProfiles`, { headers: ownerHeaders })).json()
  let profile = Array.isArray(list) && list.length ? list[0] : null
  if (!profile) {
    const res = await request.post(`${API}/api/v1/data/frontDeskProfiles`, {
      headers: ownerHeaders,
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
  execFileSync('node', ['server/scripts/set-front-desk-status.js', `--slug=${profile.slug}`, '--status=pilot'], {
    cwd: resolve(__dirname, '../..')
  })
  const enabled = Object.keys(profile.requestKinds ?? {}).filter((k) => profile.requestKinds[k].enabled)
  const sent = await request.post(`${API}/api/v1/public/${profile.slug}/requests`, {
    data: {
      kind: enabled.includes('tasting') ? 'tasting' : enabled[0],
      guestName: 'אורח בדיקה',
      guestPhone: '0501234569',
      wanted: { date: '2031-06-15', time: '19:00', partySize: 4 },
      answers: [],
      consentTerms: true
    }
  })
  expect(sent.status()).toBe(201)
  const token = (await sent.json()).token as string
  const all = await (await request.get(`${API}/api/v1/data/requests`, { headers: ownerHeaders })).json()
  requestId = all.find((r: { publicToken: string }) => r.publicToken === token)._id
})

test.afterAll(async ({ request }) => {
  if (!requestId) return
  await request.put(`${API}/api/v1/requests/${requestId}/status`, { headers: ownerHeaders, data: { status: 'cancelled' } })
})

test('555-3: signed in as the QA owner, /requests shows the public request with the tag', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/requests')
  await expect(page.getByText('טופס באתר').first()).toBeVisible()
  await page.screenshot({ path: 'screens/555-3.png' })
})
