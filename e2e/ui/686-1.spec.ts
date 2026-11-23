import { test, expect, type Page } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const T = (key: string, number: string, x: number) => ({
  key,
  number,
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true
})
const PLAN = {
  _id: 'qa-plan',
  grid: { cols: 24, rows: 16 },
  areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }],
  tables: [T('tab011', '11', 0), T('tab012', '12', 5)],
  joins: []
}

/**
 * The stubbed business: tables 11 and 12 and "כהן" on table 12, started five minutes before `now`. The stub keeps the
 * status it is sent, so the room follows an action without a real server.
 */
async function stubRoom(page: Page, now: number): Promise<void> {
  const booking = {
    _id: 'qa-b1',
    kind: 'table',
    status: 'confirmed',
    clientId: 'qa-client',
    tableKeys: ['tab012'],
    guestName: 'כהן',
    time: '19:00',
    startAt: now - 5 * 60000,
    endAt: now + 85 * 60000,
    partySize: 2
  }
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
  await page.route('**/api/v1/data/bookings**', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))
  await page.route('**/api/v1/bookings/day**', (route) =>
    route.fulfill({
      json: { bookings: [booking], coversByHour: {}, holds: [], unassigned: [], now: now + 1000 }
    })
  )
  await page.route('**/api/v1/bookings/qa-b1/status', async (route) => {
    const { status } = route.request().postDataJSON() as { status: string }
    booking.status = status
    await route.fulfill({ json: booking })
  })
}

test('686-1: seat then finish a booking from its table; the table shows free', async ({ page, context }) => {
  await signInQa(context)
  await stubRoom(page, Date.now())
  await page.goto('/bookings?view=floor')
  await page.locator('[data-testid="floor-table-12"]').click()
  await page.getByRole('button', { name: 'הגיעו' }).click()
  await page.locator('[data-testid="floor-table-12"]').click()
  await page.getByRole('button', { name: 'סיימו' }).click()
  await expect(page.locator('[data-testid="floor-state-12"]')).toHaveText('פנוי')
  await page.screenshot({ path: 'screens/686-1.png' })
})
