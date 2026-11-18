import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('618-1: the owner\'s AI examples card has no control that can be switched', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard?tab=metadata')
  const card = page.locator('#mm-sec-ai-share')
  await expect(card).toContainText('שיתוף דוגמאות AI')
  await expect(card.locator('input:enabled')).toHaveCount(0)
  await expect(card.locator('span.c-chip.is-locked')).toBeVisible()
  await page.screenshot({ path: 'screens/618-1.png' })
})
