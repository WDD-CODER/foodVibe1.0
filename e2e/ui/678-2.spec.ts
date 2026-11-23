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

test('678-2: the reminder arrives with two buttons and tapping מבטלים cancels', async ({ page, context }) => {
  await signInQa(context)
  const state = {
    rows: [row({ bookingId: 'bk-1' })],
    messages: [msg('m1', 'in', 'שלום')] as Msg[],
    conv: conversation({ bookingId: 'bk-1' })
  }
  await stub(page, state, (path, body) => {
    if (path === 'clock') {
      state.messages = [
        ...state.messages,
        msg('m2', 'out', 'תזכורת להזמנה', {
          buttons: [
            { id: 'CONFIRM:bk-1', title: 'מגיעים' },
            { id: 'CANCEL:bk-1', title: 'מבטלים' }
          ]
        })
      ]
      return { job: body.job, done: true }
    }
    if (path === 'inbound') {
      state.messages = [...state.messages, msg('m3', 'in', 'מבטלים'), msg('m4', 'out', 'ההזמנה בוטלה')]
    }
    return { conversationId: 'sim-1', messageId: 'm3' }
  })
  await page.goto('/frontdesk/simulator')
  await page.getByTestId('sim-guest').click()
  await page.getByRole('button', { name: 'הרצת תזכורת עכשיו' }).click()
  const thread = page.getByTestId('sim-thread')
  await expect(thread.getByRole('button', { name: 'מגיעים' })).toBeVisible()
  await thread.getByRole('button', { name: 'מבטלים' }).click()
  await expect(thread).toContainText('ההזמנה בוטלה')
  await page.screenshot({ path: 'screens/678-2.png' })
})
