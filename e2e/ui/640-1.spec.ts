import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('640-1: the quick-edit popup shows the loading-rule switch and its three inputs', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/equipment')
  await page.locator('.equipment-grid-row .c-list-body-cell').first().click()
  const popup = page.locator('.inline-edit-panel')
  await expect(popup.getByText('הפעל סקלה')).toBeVisible()
  await popup.getByText('הפעל סקלה').click()
  await expect(popup.getByText('לכל אורחים')).toBeVisible()
  await expect(popup.getByText('כמות מינימלית')).toBeVisible()
  await expect(popup.getByText('כמות מקסימלית')).toBeVisible()
  await page.screenshot({ path: 'screens/640-1.png' })
})
