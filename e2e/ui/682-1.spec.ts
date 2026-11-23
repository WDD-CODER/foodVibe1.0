import { test, expect, type Page } from '@playwright/test'
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
  text: 'עד מתי פתוח?',
  at: NOW - 60_000,
  status: 'delivered'
}
const AI_MSG = { ...GUEST_MSG, _id: 'a1', direction: 'out', author: 'ai', text: 'יש חניה ליד', status: 'sent' }

/** The conversations API, answered by the spec; `posts` records what the page sent. */
async function stubInbox(
  page: Page,
  opts: { suggestion?: string; messages?: object[] } = {}
): Promise<{ posts: unknown[] }> {
  const posts: unknown[] = []
  const conversation = { ...CONV, ...(opts.suggestion ? { suggestion: opts.suggestion } : {}) }
  await page.route('**/api/v1/conversations**', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      posts.push(req.postDataJSON())
      const message = { ...AI_MSG, _id: 'sent1', author: 'member', text: (req.postDataJSON() as { text: string }).text }
      return route.fulfill({ json: { message, conversation: { ...CONV, lastMessageAt: NOW } } })
    }
    if (req.url().includes('/1/messages'))
      return route.fulfill({ json: { conversation, messages: opts.messages ?? [GUEST_MSG], now: NOW } })
    return route.fulfill({ json: { conversations: [{ ...ROW, ...conversation }], now: NOW } })
  })
  return { posts }
}

test('682-1: edit the suggestion, add "!", send; the bar is gone', async ({ page, context }) => {
  await signInQa(context)
  const { posts } = await stubInbox(page, { suggestion: 'שלום, אנחנו פתוחים עד 23:00' })
  await page.goto('/inbox/1')
  await page.getByRole('button', { name: 'עריכה' }).click()
  const box = page.getByTestId('reply-text')
  await box.pressSequentially('!')
  await page.getByTestId('reply-send').click()
  await expect(page.getByTestId('suggestion-text')).toHaveCount(0)
  expect(posts[0]).toEqual({ text: 'שלום, אנחנו פתוחים עד 23:00!' })
  await page.screenshot({ path: 'screens/682-1.png' })
})
