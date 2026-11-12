import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1280, height: 720 } })

test('567-1: the kitchen group opens, saves a food cost and keeps it after reload', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/settings?tab=baseline')
  await page.getByTestId('baseline-group-kitchen').click()
  await page.getByTestId('baseline-foodCostPct').fill('30')
  await page.getByTestId('baseline-save').click()
  await expect(page.getByText('פרטי הפתיחה נשמרו')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('baseline-foodCostPct')).toHaveValue('30')
  await page.screenshot({ path: 'screens/567-1.png' })
})
