import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('602-6: /venues/list', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/venues/list')
  const cards = page.locator('.table-area--cards app-venue-card, .table-area--cards .table-body--cards > *')
  await page.locator('.table-area--cards').waitFor({ state: 'visible' })
  if ((await cards.count()) === 0) {
    await page.screenshot({ path: 'screens/602-6.png' })
    test.skip(true, 'no venue card to measure')
    return
  }
  const area = (await page.locator('.table-area--cards').boundingBox())!
  const last = (await cards.last().boundingBox())!
  const bottom = area.y + area.height
  // Only when all cards fit on one screen; otherwise the panel is capped by design.
  if (last.y + last.height < 768 - 48) {
    expect(bottom - (last.y + last.height)).toBeLessThanOrEqual(48)
  }
  await page.screenshot({ path: 'screens/602-6.png' })
})
