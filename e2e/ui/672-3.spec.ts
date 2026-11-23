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
 * The stubbed business: tables 11 and 12, an empty day, the server clock at the real now (the walk-in dialog is for
 * the live moment). `POST /bookings/walk-in` stores a seated booking on the table it is sent.
 */
async function stubRoom(page: Page): Promise<void> {
  const bookings: Record<string, unknown>[] = []
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
    route.fulfill({ json: { bookings, coversByHour: {}, holds: [], unassigned: [], now: Date.now() } })
  )
  await page.route('**/api/v1/bookings/walk-in', async (route) => {
    const body = route.request().postDataJSON() as { partySize: number; tableKeys: string[] }
    const startAt = Date.now()
    const booking = {
      _id: 'qa-walk-in',
      kind: 'table',
      status: 'seated',
      source: 'walk_in',
      clientId: '__walk_in__',
      guestName: '',
      guestPhone: '',
      tableKeys: body.tableKeys,
      time: '19:00',
      partySize: body.partySize,
      startAt,
      endAt: startAt + 90 * 60000
    }
    bookings.push(booking)
    await route.fulfill({ status: 201, json: booking })
  })
}

test('672-3: seat a walk-in from a free table; the table shows seated', async ({ page, context }) => {
  await signInQa(context)
  await stubRoom(page)
  await page.goto('/bookings?view=floor')
  await page.locator('[data-testid="floor-table-11"]').click()
  await page.getByRole('button', { name: 'הושבת מזדמנים' }).click()
  await page.screenshot({ path: 'screens/672-3.png' })
  await page.getByRole('button', { name: 'הושבה' }).click()
  await expect(page.locator('[data-testid="floor-state-11"]')).toHaveText('יושבים')
})
