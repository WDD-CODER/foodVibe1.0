import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test.use({ viewport: { width: 1366, height: 768 } })

// Plan 747 round two: a chip at the top of the dev catalog scrolls to its section; it never leaves the catalog.
test('751-1: a catalog chip scrolls to its section and the page stays on the catalog', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/dev/catalog')
  const chip = page.locator('nav.dc-bar').getByRole('button', { name: 'tooltip', exact: true })
  await expect(chip).toBeVisible()
  await expect(page.locator('nav.dc-bar a')).toHaveCount(0)
  await chip.click()
  await expect(page.locator('#tooltip')).toBeInViewport()
  expect(new URL(page.url()).pathname).toBe('/dev/catalog')
  // The section's heading has the focus, so the keyboard continues from there.
  await expect(page.locator('#tooltip > h2')).toBeFocused()
  await page.screenshot({ path: 'screens/751-1.png' })
})
