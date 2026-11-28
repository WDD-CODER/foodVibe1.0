import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

// The Hebrew value of the dictionary key `dc_disabled_sample`.
const REASON = 'אי אפשר ללחוץ: זו רק הדגמה'

// Plan 747 round two (default disabled-explains-why): a control that cannot be used says why, and its action never runs.
test('751-4: the disabled sample shows its reason on hover and its click does nothing', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dev/catalog')
  const button = page.locator('#dc-disabled-btn')
  const counter = page.locator('#dc-disabled-count')
  await button.scrollIntoViewIfNeeded()
  await expect(button).toHaveAttribute('aria-disabled', 'true')
  await expect(button).toBeDisabled()
  await expect(counter).toHaveText('0')

  await button.hover()
  const tip = page.locator('.c-tooltip')
  await expect(tip).toBeVisible()
  await expect(tip).toHaveText(REASON)
  await page.screenshot({ path: 'screens/751-4.png' })

  // force: the button is aria-disabled, so Playwright would wait for it to become enabled.
  await button.click({ force: true })
  await expect(counter).toHaveText('0')
  await expect(tip).toBeVisible()
})
