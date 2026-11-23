import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const NOW = Date.now()
const base = {
  _id: '1',
  businessId: 'qa',
  clientId: 'c-1',
  channel: 'sim',
  waId: '972501111111',
  status: 'bot',
  lastMessageAt: NOW - 60_000,
  lastInboundAt: NOW - 60_000,
  unread: 1,
  windowExpiresAt: NOW + 3_600_000
}
const client = { _id: 'c-1', name: 'דנה', phone: '0501111111' }
const inbound = {
  _id: 'm1',
  conversationId: '1',
  direction: 'in',
  author: 'guest',
  kind: 'text',
  text: 'שלום, יש מקום להערב?',
  at: NOW - 60_000,
  status: 'read'
}

test('677-2: take over, answer, and the thread offers the hand back', async ({ page, context }) => {
  await signInQa(context)
  let state = { ...base }
  const messages: Record<string, unknown>[] = [inbound]
  await page.route('**/api/v1/conversations**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    if (path.endsWith('/takeover')) {
      state = { ...state, status: 'human', assignedTo: 'me' }
      return route.fulfill({ json: state })
    }
    if (path.endsWith('/messages') && req.method() === 'POST') {
      const body = req.postDataJSON() as { text: string }
      const message = {
        _id: 'm2',
        conversationId: '1',
        direction: 'out',
        author: 'member',
        kind: 'text',
        text: body.text,
        at: Date.now(),
        status: 'sent'
      }
      messages.push(message)
      return route.fulfill({ status: 201, json: { message, conversation: state } })
    }
    if (path.endsWith('/messages')) return route.fulfill({ json: { conversation: state, messages, now: Date.now() } })
    return route.fulfill({
      json: { conversations: [{ ...state, client, last: null }], now: Date.now() }
    })
  })
  await page.goto('/inbox')
  await page.getByTestId('inbox-row').first().click()
  await page.getByTestId('take-over').click()
  await page.getByTestId('reply-text').fill('שלום דנה')
  await page.getByTestId('reply-send').click()
  await expect(page.getByTestId('chat-bubble').filter({ hasText: 'שלום דנה' })).toBeVisible()
  await expect(page.getByTestId('hand-back')).toHaveText(/החזרה לעוזר/)
  await page.screenshot({ path: 'screens/677-2.png' })
})
