import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

test('602-4: /settings?tab=team', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/settings?tab=team')
  const title = page.locator('.ph-title').first()
  const tab = page.locator('.team-tab').first()
  await expect(title).toBeVisible()
  await expect(tab).toBeVisible()
  const t = (await title.boundingBox())!
  const m = (await tab.boundingBox())!
  expect(Math.abs(t.x + t.width - (m.x + m.width))).toBeLessThanOrEqual(2)
  await page.screenshot({ path: 'screens/602-4.png' })
})
