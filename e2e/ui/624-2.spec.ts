import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('624-2: switching the scaling rule on shows the guests field', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/equipment/add')
  await page.getByText('הפעל סקלה').click()
  await expect(page.getByText('לכל אורחים')).toBeVisible()
  await page.screenshot({ path: 'screens/624-2.png' })
})
