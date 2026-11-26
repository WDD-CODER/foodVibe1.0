import { test, expect } from '@playwright/test'

test('584-1: sign-up opens the terms, the confirm unlocks at the end and checks the row', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByTestId('welcome-sign-up').click()
  await page.getByTestId('auth-terms-link').click()

  const accept = page.getByTestId('terms-accept')
  await expect(accept).toBeVisible()
  // Plan 747: blocked with a reason (aria-disabled, it says why), not natively disabled.
  await expect(accept).toHaveAttribute('aria-disabled', 'true')
  await page.screenshot({ path: 'screens/584-1.png' })

  await page.getByTestId('terms-body').evaluate((el) => {
    el.scrollTop = el.scrollHeight
    el.dispatchEvent(new Event('scroll'))
  })
  await expect(accept).not.toHaveAttribute('aria-disabled', 'true')
  await expect(accept).toBeEnabled()
  await accept.click()

  await expect(page.getByTestId('terms-body')).toHaveCount(0)
  await expect(page.locator('#auth-terms-box')).toBeChecked()
  await expect(page.getByTestId('auth-terms-row')).toContainText('קראתי ואני מסכים/ה')
})
