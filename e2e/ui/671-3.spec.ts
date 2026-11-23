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

/** The stubbed business: the tables module on, a plan with tables 11 and 12, "כהן" on table 12 in 30 minutes. */
async function stubRoom(page: Page, now: number): Promise<void> {
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
  await page.route('**/api/v1/floor-plan/confirm-mode', (route) => route.fulfill({ json: { confirmMode: 'auto' } }))
  await page.route('**/api/v1/floor-plan', (route) => route.fulfill({ json: { plan: PLAN } }))
  await page.route('**/api/v1/bookings/day**', (route) =>
    route.fulfill({
      json: {
        bookings: [
          {
            _id: 'qa-b1',
            kind: 'table',
            status: 'confirmed',
            tableKeys: ['tab012'],
            guestName: 'כהן',
            time: new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Jerusalem',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).format(now + 30 * 60000),
            startAt: now + 30 * 60000,
            endAt: now + 120 * 60000,
            partySize: 2
          }
        ],
        coversByHour: {},
        holds: [],
        unassigned: [],
        now
      }
    })
  )
}

test('671-3: the owner taps the manual mode button and it reads automatic', async ({ page, context }) => {
  await signInQa(context)
  await stubRoom(page, Date.now())
  await page.goto('/bookings?view=floor')
  const mode = page.locator('[data-testid="fv-mode"]')
  await expect(mode).toHaveText('אישור ידני')
  await mode.click()
  await expect(mode).toHaveText('אישור אוטומטי')
  await page.screenshot({ path: 'screens/671-3.png' })
})
