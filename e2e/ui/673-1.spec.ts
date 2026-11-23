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

/** Today's date in Jerusalem (the date the service screen opens on). */
const jerusalemToday = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

/**
 * The stubbed business: tables 11 and 12 free, a waiting list that keeps its state, and a seat call that writes the
 * walk-in booking into the stubbed day, as the server does.
 */
async function stubRoom(page: Page, today: string): Promise<void> {
  const now = Date.parse(`${today}T00:05:00+02:00`)
  const bookings: Record<string, unknown>[] = []
  const entries: Record<string, unknown>[] = []
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
    route.fulfill({ json: { bookings, coversByHour: {}, holds: [], unassigned: [], now } })
  )
  await page.route('**/api/v1/waitlist**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'GET') return route.fulfill({ json: { entries, now } })
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>
      const entry = { _id: 'qa-w-' + entries.length, status: 'waiting', joinedAt: now - 3 * 60000, ...body }
      entries.push(entry)
      return route.fulfill({ status: 201, json: entry })
    }
    const [, id, action] = url.pathname.match(/\/waitlist\/([^/]+)\/(\w+)$/) ?? []
    const entry = entries.find((e) => e['_id'] === id)
    if (!entry) return route.fulfill({ status: 404, json: { error: 'Entry not found' } })
    if (action === 'seat') {
      const { tableKeys } = request.postDataJSON() as { tableKeys: string[] }
      const booking = {
        _id: 'qa-b-' + bookings.length,
        kind: 'table',
        status: 'seated',
        source: 'walk_in',
        clientId: '__walk_in__',
        guestName: entry['guestName'],
        guestPhone: '',
        tableKeys,
        date: today,
        time: '00:05',
        partySize: entry['partySize'],
        startAt: now,
        endAt: now + 90 * 60000
      }
      bookings.push(booking)
      entry['status'] = 'seated'
      entry['bookingId'] = booking._id
    } else entry['status'] = action === 'left' ? 'left' : 'notified'
    return route.fulfill({ json: entry })
  })
}

test('673-1: a waiting party is added, seated on table 11 and leaves the list', async ({ page, context }) => {
  await signInQa(context)
  await stubRoom(page, jerusalemToday())
  await page.goto('/bookings?view=floor')
  await page.locator('[data-testid="fv-waitlist-open"]').click()
  await page.locator('#wl-name').fill('לוי')
  await page.locator('[data-testid="wl-add"]').click()
  await expect(page.locator('[data-testid="wl-row"]')).toContainText('לוי')
  await page.screenshot({ path: 'screens/673-1.png' })
  await page.locator('[data-testid="wl-seat"]').click()
  await page.locator('[data-testid="floor-table-11"]').click()
  await expect(page.locator('[data-testid="floor-name-11"]')).toContainText('לוי')
  await expect(page.locator('[data-testid="fv-waitlist-open"]')).toContainText('רשימת המתנה (0)')
})
