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
 * The stubbed business: tables 11 and 12, an empty day, a server clock just after midnight (so every evening time is
 * still ahead). `POST /bookings` stores what it is sent on the table the engine would name (11) unless the body names one.
 */
async function stubRoom(page: Page, today: string): Promise<void> {
  const now = Date.parse(`${today}T00:05:00+02:00`)
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
    route.fulfill({ json: { bookings, coversByHour: {}, holds: [], unassigned: [], now } })
  )
  await page.route('**/api/v1/bookings/availability**', (route) =>
    route.fulfill({
      json: {
        slots: [
          { time: '19:00', available: true },
          { time: '20:00', available: true },
          { time: '21:00', available: true }
        ]
      }
    })
  )
  await page.route('**/api/v1/bookings', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const body = route.request().postDataJSON() as {
      date: string
      time: string
      partySize: number
      guest?: { name: string; phone: string }
      tableKeys?: string[]
    }
    const startAt = Date.parse(`${body.date}T${body.time}:00+02:00`)
    const booking = {
      _id: 'qa-new-' + bookings.length,
      kind: 'table',
      status: 'confirmed',
      source: 'phone',
      clientId: 'qa-client',
      guestName: body.guest?.name ?? '',
      guestPhone: body.guest?.phone ?? '',
      tableKeys: body.tableKeys ?? ['tab011'],
      date: body.date,
      time: body.time,
      partySize: body.partySize,
      startAt,
      endAt: startAt + 90 * 60000
    }
    bookings.push(booking)
    await route.fulfill({ status: 201, json: booking })
  })
}

test('672-1: a phone booking lands on the table the dialog offered', async ({ page, context }) => {
  await signInQa(context)
  await stubRoom(page, jerusalemToday())
  await page.goto('/bookings?view=floor')
  await page.getByRole('button', { name: 'הזמנה חדשה' }).click()
  await page.locator('#nb-name').fill('דנה כהן')
  await page.locator('#nb-phone').fill('0521234567')
  await page.locator('[data-testid="nb-time-20:00"]').click()
  const offered = (await page.locator('[data-testid="nb-offered"]').innerText()).match(/\d+/)?.[0]
  expect(offered).toBeTruthy()
  await page.screenshot({ path: 'screens/672-1.png' })
  await page.locator('[data-testid="nb-save"]').click()
  await expect(page.locator('[data-testid="new-booking-dialog"]')).toBeHidden()
  await page.locator('[data-testid="fv-strip-20:00"]').click()
  await expect(page.locator(`[data-testid="floor-name-${offered}"]`)).toContainText('דנה כהן')
})
