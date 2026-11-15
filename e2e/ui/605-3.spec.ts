import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 375, height: 812 } })

test('605-3: a waiting request card lays its buttons out as full approve plus a pair', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/requests')
  const card = page.locator('[data-testid="request-card"]', { has: page.locator('[data-testid="request-ask"]') }).first()
  test.skip(!(await card.isVisible({ timeout: 10000 }).catch(() => false)), 'No waiting request with an ask button')
  const box = async (id: string) => (await card.locator(`[data-testid="${id}"]`).boundingBox())!
  const actions = (await card.locator('.rq-actions').boundingBox())!
  const approve = await box('request-approve')
  const ask = await box('request-ask')
  const decline = await box('request-decline')
  expect(Math.abs(approve.width - actions.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(ask.y - decline.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(ask.width - decline.width)).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/605-3.png' })
})
