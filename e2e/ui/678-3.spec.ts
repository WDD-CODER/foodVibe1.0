import { test, expect, type Page } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const NOW = Date.now()
const PHONE = '0500000001'
type Msg = Record<string, unknown>
const msg = (id: string, direction: 'in' | 'out', text: string, extra: Msg = {}): Msg => ({
  _id: id,
  conversationId: 'sim-1',
  direction,
  author: direction === 'in' ? 'guest' : 'ai',
  kind: 'text',
  text,
  status: 'delivered',
  at: NOW,
  ...extra
})
const conversation = (over: Msg = {}): Msg => ({
  _id: 'sim-1',
  businessId: 'qa',
  clientId: 'c-1',
  channel: 'sim',
  waId: '972500000001',
  status: 'bot',
  lastMessageAt: NOW,
  lastInboundAt: NOW,
  unread: 0,
  windowExpiresAt: NOW + 3_600_000,
  test: true,
  ...over
})
const row = (over: Msg = {}): Msg => ({
  ...conversation(over),
  client: { _id: 'c-1', name: 'אורח בדיקה', phone: PHONE, tags: ['test'] },
  last: null
})

/** Stateful stubs of the conversation and sim calls: the spec answers them itself. */
async function stub(page: Page, state: { rows: Msg[]; messages: Msg[]; conv: Msg }, onSim: (path: string, body: Msg) => unknown) {
  await page.route('**/api/v1/conversations**', (route) => {
    const url = route.request().url()
    if (url.includes('/messages')) return route.fulfill({ json: { conversation: state.conv, messages: state.messages, now: Date.now() } })
    return route.fulfill({ json: { conversations: state.rows, now: Date.now() } })
  })
  await page.route('**/api/v1/sim/**', (route) => {
    const path = new URL(route.request().url()).pathname.split('/sim/')[1]
    const body = (route.request().postDataJSON() ?? {}) as Msg
    return route.fulfill({ json: onSim(path, body) as object })
  })
}

test('678-3: clearing the test data empties the guest list', async ({ page, context }) => {
  await signInQa(context)
  const state = { rows: [row()], messages: [msg('m1', 'in', 'שלום')] as Msg[], conv: conversation() }
  await stub(page, state, (path) => {
    if (path === 'test-data') state.rows = []
    return {}
  })
  await page.goto('/frontdesk/simulator')
  await expect(page.getByTestId('sim-guest')).toHaveCount(1)
  await page.getByRole('button', { name: 'ניקוי נתוני בדיקה' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'ניקוי נתוני בדיקה' }).click()
  await expect(page.getByText('אין אורחי בדיקה')).toBeVisible()
  await page.screenshot({ path: 'screens/678-3.png' })
})
