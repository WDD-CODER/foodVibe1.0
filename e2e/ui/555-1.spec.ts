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
  } else if (!profile.requestKinds?.tasting?.enabled) {
    const res = await request.put(`${API}/api/v1/data/frontDeskProfiles/${profile._id}`, {
      headers,
      data: { ...profile, requestKinds: { ...profile.requestKinds, tasting: kind(60) } }
    })
    expect(res.ok()).toBeTruthy()
  }
  slug = profile.slug
  // Until plan 557's admin switch: make the QA profile public (local target).
  execFileSync('node', ['server/scripts/set-front-desk-status.js', `--slug=${slug}`, '--status=pilot'], {
    cwd: resolve(__dirname, '../..')
  })
})

test('555-1: signed out, the public page sends a tasting request and shows the reference', async ({ page }) => {
  await page.goto(`/book/${slug}`)
  await expect(page.locator('app-header')).toHaveCount(0)
  await expect(page.locator('.pb-name')).toBeVisible()
  await page.getByText('טעימה', { exact: true }).click()
  await page.getByTestId('pb-next').click()
  await page.locator('#pb-date').fill('15062031')
  await page.locator('#pb-time').fill('1900')
  await page.locator('app-counter .value-input').fill('10')
  await page.getByTestId('pb-next').click()
  await page.locator('#pb-name').fill('אורח בדיקה')
  await page.locator('#pb-phone').fill('0501234567')
  await page.getByTestId('pb-consent').check()
  await page.getByRole('button', { name: 'שליחת הבקשה' }).click()
  await expect(page.getByText('הבקשה נשלחה')).toBeVisible()
  await expect(page.getByTestId('pb-reference')).toContainText('מספר בקשה:')
  await page.screenshot({ path: 'screens/555-1.png' })
})
