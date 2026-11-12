import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 390, height: 844 } })

test('586-1: the clients list on a phone switches columns with the carousel arrows', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/clients')
  const header = page.locator('app-column-carousel-header')
  await expect(header).toBeVisible()
  const label = header.locator('.cc-header')
  const before = await label.getAttribute('aria-label')
  await header.locator('.cc-arrow--next').click()
  await expect(label).not.toHaveAttribute('aria-label', before ?? '')
  await page.screenshot({ path: 'screens/586-1.png' })
})
