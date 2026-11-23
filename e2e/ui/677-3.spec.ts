import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const NOW = Date.now()
const conv = (id: string, over: Record<string, unknown>) => ({
  _id: id,
  businessId: 'qa',
  clientId: 'c-' + id,
  channel: 'sim',
  waId: '97250000000' + id,
  status: 'bot',
  lastMessageAt: NOW - 60_000,
  lastInboundAt: NOW - 60_000,
  unread: 0,
  windowExpiresAt: NOW + 3_600_000,
  ...over
})
const DANA = {
  ...conv('1', { unread: 1 }),
  client: { _id: 'c-1', name: 'דנה', phone: '0501111111' },
  last: { text: 'שלום', direction: 'in', kind: 'text', at: NOW - 60_000 }
}
const YOSI = {
  ...conv('2', { status: 'human', assignedTo: 'someone-else', lastMessageAt: NOW - 600_000 }),
  client: { _id: 'c-2', name: 'יוסי', phone: '0502222222' },
  last: { text: 'תודה', direction: 'in', kind: 'text', at: NOW - 600_000 }
}

test('677-3: on a phone the list gives way to the thread and back', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await signInQa(context)
  await page.route('**/api/v1/conversations**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/2/messages')) {
      return route.fulfill({
        json: {
          conversation: conv('2', { status: 'human', assignedTo: 'someone-else' }),
          messages: [
            {
              _id: 'm1',
              conversationId: '2',
              direction: 'in',
              author: 'guest',
              kind: 'text',
              text: 'תודה',
              at: NOW - 600_000,
              status: 'read'
            }
          ],
          now: Date.now()
        }
      })
    }
    return route.fulfill({ json: { conversations: [DANA, YOSI], now: Date.now() } })
  })
  await page.goto('/inbox')
  await expect(page.getByTestId('inbox-row').filter({ hasText: 'דנה' })).toBeVisible()
  await page.getByTestId('inbox-row').filter({ hasText: 'יוסי' }).click()
  await expect(page.getByTestId('thread-name')).toHaveText('יוסי')
  await expect(page.getByTestId('inbox-list')).toBeHidden()
  await page.screenshot({ path: 'screens/677-3.png' })
  await page.getByTestId('inbox-back').click()
  await expect(page.getByTestId('inbox-row').filter({ hasText: 'דנה' })).toBeVisible()
})
