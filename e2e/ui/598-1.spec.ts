import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('598-1: no floating button over the form buttons on a phone', async ({ page, context }) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/inventory/add')
  await expect(page.locator('.hero-fab-container')).toBeHidden()
  const back = page.getByRole('button', { name: 'חזור לרשימה' })
  await expect(back).toBeVisible()
  await expect(back).toBeEnabled()
  await page.screenshot({ path: 'screens/598-1.png' })
})
