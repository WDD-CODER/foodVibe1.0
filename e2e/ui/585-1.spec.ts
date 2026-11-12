import { test, expect } from '@playwright/test'

test('585-1: at 1440x900 the terms confirm is disabled until the text is scrolled to its end', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/welcome')
  // the dev guest may be signed in; sign out so /welcome stays open
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('/welcome')
  await page.getByTestId('welcome-sign-up').click()
  await page.getByTestId('auth-terms-link').click()

  const accept = page.getByTestId('terms-accept')
  await expect(accept).toBeVisible()
  await expect(accept).toBeDisabled()
  await page.screenshot({ path: 'screens/585-1.png' })

  await page.getByTestId('terms-body').evaluate((el) => {
    el.scrollTop = el.scrollHeight
    el.dispatchEvent(new Event('scroll'))
  })
  await expect(accept).toBeEnabled()
})
