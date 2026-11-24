import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('702-3: the username button on /dashboard signs out', async ({ page, context }) => {
  await signInQa(context)
  let logoutPosts = 0
  await page.route('**/auth/logout', (route) => {
    if (route.request().method() === 'POST') logoutPosts += 1
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/dashboard')
  await page.locator('.auth-username-btn').click()
  await expect.poll(() => logoutPosts).toBeGreaterThan(0)
  await expect(page.locator('.auth-link')).toBeVisible()
  await page.screenshot({ path: 'screens/702-3.png' })
})
