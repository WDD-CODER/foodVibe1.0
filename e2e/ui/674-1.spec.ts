import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('674-1: the "draw your room" row of the setup card opens the floor plan editor', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/business/setup-status', (route) =>
    route.fulfill({
      json: {
        frontDesk: {
          businessType: 'restaurant',
          items: [
            { key: 'profile_basics', done: true },
            { key: 'floor_plan', done: false }
          ],
          done: 1,
          total: 2
        }
      }
    })
  )
  await page.goto('/dashboard')
  await page.locator('[data-testid="frontdesk-row-floor_plan"] a').click()
  await expect(page).toHaveURL(/\/frontdesk\/floor-plan$/)
  await page.screenshot({ path: 'screens/674-1.png' })
})
