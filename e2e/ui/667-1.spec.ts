import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

// The QA business has neither the tables module nor a restaurant profile: the spec answers both itself.
const profile: Record<string, unknown> = {
  _id: 'qa-profile',
  schemaVersion: 2,
  businessId: 'qa',
  createdAt: 1763500000000,
  updatedAt: 1763500000000,
  businessType: 'restaurant',
  slug: 'qa-place',
  displayName: 'מסעדת בדיקה',
  hours: [],
  closedDates: [],
  requestKinds: { table: { enabled: true, questions: [], rules: {}, expireAfterHours: 24 } },
  assistant: { level: 0, tone: 'warm' },
  status: 'draft'
}

test('667-1: the confirm-mode switch is stored at once and survives a reload', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'frontdesk', 'tables'] } })
  })
  await page.route('**/api/v1/data/frontDeskProfiles**', (route) => route.fulfill({ json: [profile] }))
  await page.route('**/api/v1/floor-plan/confirm-mode', async (route) => {
    const { confirmMode } = route.request().postDataJSON() as { confirmMode: string }
    profile['tableService'] = { ...(profile['tableService'] as object | undefined), confirmMode }
    await route.fulfill({ json: { confirmMode } })
  })

  await page.goto('/frontdesk/settings')
  const card = page.locator('[data-testid="table-service-card"]')
  await expect(card.getByText('הגדרות שולחנות')).toBeVisible()
  await expect(card.getByText('אני מאשר כל הזמנה', { exact: true })).toBeVisible()

  await card.locator('label.c-chip--toggle', { has: page.locator('[data-testid="confirm-mode-switch"]') }).click()
  await expect(card.getByText('שולחן פנוי מאושר מיד', { exact: true })).toBeVisible()

  await page.reload()
  await expect(card.getByText('שולחן פנוי מאושר מיד', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'screens/667-1.png' })
})
