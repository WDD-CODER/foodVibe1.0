import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const DATE = '2035-05-01'
const PLAN = {
  _id: 'qa-plan',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [
    {
      key: 'tab011',
      number: '11',
      areaKey: 'areaa1',
      shape: 'square',
      minSeats: 2,
      maxSeats: 4,
      x: 0,
      y: 0,
      w: 3,
      h: 3,
      turned: false,
      active: true,
      online: true
    }
  ],
  joins: []
}
const REQUEST = {
  _id: 'qa-r1',
  kind: 'table',
  status: 'qualified',
  channel: 'manual',
  clientId: 'qa-client',
  guestName: 'דנה כהן',
  guestPhone: '0521234567',
  wanted: { date: DATE, time: '20:00', partySize: 2 },
  answers: [],
  statusHistory: [{ status: 'new', at: Date.now() - 1000, by: 'u', byName: 'u', via: 'member' }],
  createdAt: Date.now() - 1000,
  updatedAt: Date.now() - 1000
}

test('672-4: a refused approve opens the no-table dialog; an alternative hour approves it', async ({ page, context }) => {
  await signInQa(context)
  let approves = 0
  await page.route('**/api/v1/business', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, modules: [...(body.modules ?? []), 'frontdesk', 'tables'] } })
  })
  await page.route('**/api/v1/data/frontDeskProfiles**', (route) =>
    route.fulfill({
      json: [
        {
          _id: 'qa-profile',
          hours: [{ dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '00:00', close: '23:59' }],
          tableService: { confirmMode: 'manual' }
        }
      ]
    })
  )
  await page.route('**/api/v1/data/requests**', (route) => route.fulfill({ json: [REQUEST] }))
  await page.route('**/api/v1/data/bookings**', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))
  await page.route('**/api/v1/bookings/day**', (route) =>
    route.fulfill({ json: { bookings: [], coversByHour: {}, holds: [], unassigned: [], now: Date.now() } })
  )
  await page.route('**/api/v1/requests/qa-r1/approve', async (route) => {
    approves += 1
    if (approves === 1) {
      return route.fulfill({
        status: 409,
        json: { error: 'NO_TABLE', alternatives: [{ date: DATE, time: '21:00' }] }
      })
    }
    await route.fulfill({
      json: {
        request: { ...REQUEST, status: 'approved', outcome: { type: 'booking', id: 'qa-b1' } },
        outcome: {
          _id: 'qa-b1',
          kind: 'table',
          status: 'confirmed',
          clientId: 'qa-client',
          guestName: 'דנה כהן',
          tableKeys: ['tab011'],
          time: '21:00',
          partySize: 2,
          startAt: Date.parse(`${DATE}T21:00:00+02:00`),
          endAt: Date.parse(`${DATE}T22:30:00+02:00`)
        }
      }
    })
  })
  await page.goto('/requests')
  await page.locator('[data-testid="request-approve"]').click()
  await expect(page.getByText('אין שולחן פנוי בשעה שביקשו')).toBeVisible()
  await page.screenshot({ path: 'screens/672-4.png' })
  await page.locator('[data-testid="att-alt-21:00"]').click()
  await expect(page.locator('[data-testid="approve-table-dialog"]')).toBeHidden()
})
