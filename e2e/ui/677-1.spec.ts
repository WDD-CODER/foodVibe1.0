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
const ROWS = [
  {
    ...conv('1', { unread: 1 }),
    client: { _id: 'c-1', name: 'דנה', phone: '0501111111' },
    last: { text: 'שלום, יש מקום להערב?', direction: 'in', kind: 'text', at: NOW - 60_000 }
  },
  {
    ...conv('2', { status: 'human', assignedTo: 'someone-else', lastMessageAt: NOW - 600_000 }),
    client: { _id: 'c-2', name: 'יוסי', phone: '0502222222' },
    last: { text: 'תודה רבה', direction: 'in', kind: 'text', at: NOW - 600_000 }
  }
]

test('677-1: the row of דנה is first and shows the tag העוזר', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/conversations**', (route) =>
    route.fulfill({ json: { conversations: ROWS, now: NOW } })
  )
  await page.goto('/inbox')
  const rows = page.getByTestId('inbox-row')
  await expect(rows.first()).toContainText('דנה')
  await expect(rows.first().getByTestId('holder-tag')).toHaveText('העוזר')
  await page.screenshot({ path: 'screens/677-1.png' })
})
