import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('620-4: the owner card shows the locked shared chip', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dashboard?tab=metadata')
  const chip = page.getByTestId('ai-examples-share-state')
  await expect(chip).toContainText('משותף עם FoodVibe')
  await page.screenshot({ path: 'screens/620-4.png' })
})
