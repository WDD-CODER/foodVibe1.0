import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test("620-4: the owner's AI card shows the shared chip", async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard?tab=metadata')
  const card = page.locator('#mm-sec-ai-share')
  await expect(card.locator('span.c-chip.is-locked')).toContainText('משותף עם FoodVibe')
  await page.screenshot({ path: 'screens/620-4.png' })
})
