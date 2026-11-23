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
  text: 'יש חניה?',
  at: NOW - 120_000,
  status: 'delivered'
}
const AI = { ...GUEST, _id: 'a1', direction: 'out', author: 'ai', text: 'כן, יש חניה', at: NOW - 60_000, status: 'sent' }

test('682-3: fix an assistant answer; the saved message shows and the dialog closes', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/conversations**', (route) =>
    route.request().url().includes('/1/messages')
      ? route.fulfill({ json: { conversation: CONV, messages: [GUEST, AI], now: NOW } })
      : route.fulfill({
          json: { conversations: [{ ...CONV, client: { _id: 'c-1', name: 'דנה', phone: '050' }, last: null }], now: NOW }
        })
  )
  await page.route('**/api/v1/ai/frontdesk/fix', (route) => route.fulfill({ json: { item: {}, drafted: true } }))
  await page.goto('/inbox/1')
  await page.getByRole('button', { name: 'תיקון התשובה' }).click()
  await page.getByTestId('fix-answer').fill('אין חניה במקום')
  await page.getByTestId('fix-dialog').locator('app-custom-select').click()
  await page.getByText('מידע שגוי').click()
  await page.getByRole('button', { name: 'שמירה' }).click()
  await expect(page.getByText('נשמרה טיוטה למידע על העסק')).toBeVisible()
  await expect(page.getByTestId('fix-dialog')).toHaveCount(0)
  await page.screenshot({ path: 'screens/682-3.png' })
})
