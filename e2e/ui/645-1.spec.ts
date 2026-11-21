import { test, expect, type Page } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

/** How long the main thread takes to answer a click on the search box, in milliseconds. */
async function clickAnswerMs(page: Page): Promise<number> {
  const started = Date.now()
  await page.locator('#stock-count-search').click({ timeout: 5000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))))
  return Date.now() - started
}

test('645-1: the stock count sheet answers a click within 1 second after load and after a scroll to the end', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.goto('/inventory/count')
  await expect(page.locator('[data-testid="stk-row"]').first()).toBeVisible({ timeout: 30000 })
  expect(await clickAnswerMs(page)).toBeLessThan(1000)
  expect(await page.locator('[data-testid="stk-row"]').count()).toBeLessThan(100)

  await page.mouse.wheel(0, 100000)
  const more = page.locator('[data-testid="stk-show-more"]')
  if (await more.isVisible()) {
    await more.click()
    await page.mouse.wheel(0, 100000)
  }
  expect(await clickAnswerMs(page)).toBeLessThan(1000)
  await page.screenshot({ path: 'screens/645-1.png' })
})
