import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('598-2: the floating button is still on the list on a phone', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/inventory/list')
  await expect(page.locator('.fab-main')).toBeVisible()
  await page.screenshot({ path: 'screens/598-2.png' })
})
