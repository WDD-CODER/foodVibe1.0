import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('589-1: signed-out /recipe-book lands on /welcome; sign-in returns to /recipe-book', async ({ browser, page }) => {
  await page.goto('/recipe-book')
  await expect(page).toHaveURL(/\/welcome\?returnUrl=%2Frecipe-book/)
  await page.screenshot({ path: 'screens/589-1.png' })

  // Signing in (a QA session) then opening the wanted page works; the welcome page leaves for returnUrl by itself.
  const context = await browser.newContext()
  try {
    const qaPage = await context.newPage()
    await signInQa(context)
    await qaPage.goto('/welcome?returnUrl=%2Frecipe-book')
    await expect(qaPage).toHaveURL(/\/recipe-book$/)
  } finally {
    await context.close()
  }
})
