import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('613-1: top menu stays one row and the pills scroll sideways at 800 and 1000 px', async ({ page, context }) => {
  await signInQa(context)

  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/dashboard')
  const nav = page.locator('.header-nav')
  const pills = page.locator('.nav-pills')
  await expect(pills).toBeVisible()

  expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(70)
  const sizes = await pills.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
  expect(sizes.sw).toBeGreaterThan(sizes.cw)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await pills.evaluate((el) => {
    el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -el.scrollWidth : el.scrollWidth
  })
  await expect(page.locator('.nav-pills .nav-pill').last()).toBeInViewport()
  await page.screenshot({ path: 'screens/613-1.png' })

  await page.setViewportSize({ width: 1000, height: 900 })
  await page.goto('/dashboard')
  await expect(pills).toBeVisible()
  expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(70)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
