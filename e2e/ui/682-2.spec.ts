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
const GUEST = {
  _id: 'g1',
  conversationId: '1',
  direction: 'in',
  author: 'guest',
  kind: 'text',
  text: 'עד מתי פתוח?',
  at: NOW - 60_000,
  status: 'delivered'
}

test('682-2: "הצע תשובה" shows the suggested text in the bar', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/conversations**', (route) =>
    route.request().url().includes('/1/messages')
      ? route.fulfill({ json: { conversation: CONV, messages: [GUEST], now: NOW } })
      : route.fulfill({
          json: { conversations: [{ ...CONV, client: { _id: 'c-1', name: 'דנה', phone: '050' }, last: null }], now: NOW }
        })
  )
  await page.route('**/api/v1/ai/frontdesk/suggest', (route) => route.fulfill({ json: { suggestion: 'נשמח לראותכם' } }))
  await page.goto('/inbox/1')
  await page.getByRole('button', { name: 'הצע תשובה' }).click()
  await expect(page.getByTestId('suggestion-text')).toHaveText('נשמח לראותכם')
  await page.screenshot({ path: 'screens/682-2.png' })
})
