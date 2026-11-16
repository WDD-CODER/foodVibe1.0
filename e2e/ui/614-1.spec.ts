import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('614-1: the dish builder opens with the name from the menu', async ({ page, context }) => {
  await signInQa(context)
  await page.goto((process.env['E2E_APP_URL'] ?? 'http://localhost:4200') + '/recipe-builder?type=dish&name=' + encodeURIComponent("קרפצ'יו דג"))
  const name = page.locator('input[formcontrolname="nameHebrew"]').first()
  await expect(name).toBeVisible()
  await expect(name).toHaveValue("קרפצ'יו דג")
  await page.screenshot({ path: 'screens/614-1.png' })
})
