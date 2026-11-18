import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('629-3: the business settings form has the price-rise alert field', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/settings?tab=business')
  await expect(page.getByText('התראת עליית מחיר (%)')).toBeVisible()
  await page.screenshot({ path: 'screens/629-3.png' })
})
