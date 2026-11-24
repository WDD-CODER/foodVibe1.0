import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const NOW = Date.now()
const CONV = {
  _id: '1',
  businessId: 'qa',
  clientId: 'c-1',
  channel: 'sim',
  waId: '972500000001',
  status: 'human',
  assignedTo: 'someone',
  lastMessageAt: NOW - 60_000,
  lastInboundAt: NOW - 60_000,
  unread: 0,
  windowExpiresAt: NOW + 3_600_000
}
const ROW = { ...CONV, client: { _id: 'c-1', name: 'דנה', phone: '0501111111' }, last: null }
const GUEST_MSG = {
  _id: 'g1',
  conversationId: '1',
  direction: 'in',
  author: 'guest',
  kind: 'text',
  text: 'יש חניה?',
  at: NOW - 60_000,
  status: 'delivered'
}

test('702-2: a failed suggestion says why', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/ai/frontdesk/suggest', (route) =>
    route.fulfill({ status: 502, json: { error: 'AI_FAILED', reason: 'busy' } })
  )
  await page.route('**/api/v1/conversations**', (route) => {
    if (route.request().url().includes('/1/messages'))
      return route.fulfill({ json: { conversation: CONV, messages: [GUEST_MSG], now: NOW } })
    return route.fulfill({ json: { conversations: [ROW], now: NOW } })
  })
  await page.goto('/inbox/1')
  await page.getByTestId('suggestion-ask').click()
  await expect(page.getByText('העוזר עמוס כרגע. נסו שוב בעוד דקה')).toBeVisible()
  await page.screenshot({ path: 'screens/702-2.png' })
})
