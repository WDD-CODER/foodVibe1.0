import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('597-1: bottom-bar labels sit inside their tabs and the viewport, never overlapping', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/dashboard')
  const tabs = page.locator('.bottom-nav > a, .bottom-nav .bottom-nav__item')
  await expect(tabs.first()).toBeVisible()
  const count = await tabs.count()
  const boxes: { x: number; right: number }[] = []
  for (let i = 0; i < count; i++) {
    const tab = await tabs.nth(i).boundingBox()
    const label = await tabs.nth(i).locator('.bottom-nav__label').boundingBox()
    expect(tab && label).toBeTruthy()
    expect(label!.x).toBeGreaterThanOrEqual(tab!.x - 0.5)
    expect(label!.x + label!.width).toBeLessThanOrEqual(tab!.x + tab!.width + 0.5)
    expect(label!.x).toBeGreaterThanOrEqual(0)
    expect(label!.x + label!.width).toBeLessThanOrEqual(375)
    boxes.push({ x: label!.x, right: label!.x + label!.width })
  }
  boxes.sort((a, b) => a.x - b.x)
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].right)
  await page.screenshot({ path: 'screens/597-1.png' })
})
