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

const jerusalemToday = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

/** The stubbed business of 672-1 (tables 11 and 12, an empty day, a server clock just after midnight). */
async function stubRoom(page: Page, today: string): Promise<void> {
  const now = Date.parse(`${today}T00:05:00+02:00`)
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
    route.fulfill({ json: { bookings: [], coversByHour: {}, holds: [], unassigned: [], now } })
  )
  await page.route('**/api/v1/bookings/availability**', (route) =>
    route.fulfill({
      json: {
        slots: [
          { time: '19:00', available: true },
          { time: '20:00', available: true }
        ]
      }
    })
  )
}

test('672-2: for staff the dialog offers a table and has no "pick another table" hint', async ({ page, context }) => {
  await signInQa(context)
  // The signed-in user's answer: the same QA user, with the staff role (the page reads the role from it).
  await context.addInitScript(() => {
    const user = JSON.parse(sessionStorage.getItem('loggedInUser') ?? '{}') as Record<string, unknown>
    user['businessRole'] = 'staff'
    sessionStorage.setItem('loggedInUser', JSON.stringify(user))
  })
  await stubRoom(page, jerusalemToday())
  await page.goto('/bookings?view=floor')
  await page.getByRole('button', { name: 'הזמנה חדשה' }).click()
  await page.locator('[data-testid="nb-time-20:00"]').click()
  await expect(page.locator('[data-testid="nb-offered"]')).toBeVisible()
  await expect(page.locator('[data-testid="nb-pick-other"]')).toHaveCount(0)
  await page.screenshot({ path: 'screens/672-2.png' })
})
