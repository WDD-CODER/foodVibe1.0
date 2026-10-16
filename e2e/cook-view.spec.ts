import { test, expect, type Page } from '@playwright/test'

// Cook View (plan 404) — read-only smoke checks: nothing here saves to the database.
// Needs the dev server with a seeded kitchen (guest auto-login). Recipes are picked from the
// loaded kitchen state through Angular's dev-mode `ng` global, so no fixed ids are assumed.

interface RecipeLite {
  _id: string
  recipeType?: string
  steps?: unknown[]
  prepItems?: unknown[]
}

async function pickRecipe(page: Page, kind: 'recipe' | 'dish'): Promise<string> {
  await page.goto('/cook')
  await page.waitForFunction(() => {
    const w = window as unknown as { ng?: { getComponent: (el: Element) => unknown } }
    const host = document.querySelector('app-cook-view-page')
    const cmp = host && w.ng?.getComponent(host) as { kitchenState?: { recipes_: () => unknown[] } } | null
    return (cmp?.kitchenState?.recipes_().length ?? 0) > 0
  })
  const id = await page.evaluate((k) => {
    const w = window as unknown as { ng: { getComponent: (el: Element) => unknown } }
    const cmp = w.ng.getComponent(document.querySelector('app-cook-view-page')!) as {
      kitchenState: { recipes_: () => RecipeLite[] }
    }
    const all = cmp.kitchenState.recipes_()
    const hit =
      k === 'dish'
        ? all.find((r) => r.recipeType === 'dish' && (r.prepItems?.length ?? 0) > 0)
        : all.find((r) => r.recipeType !== 'dish' && (r.steps?.length ?? 0) > 1)
    return hit?._id ?? ''
  }, kind)
  test.skip(!id, `no ${kind} with steps/prep items in this kitchen`)
  return id
}

test.describe('Cook View', () => {
  test('recipe: header, panes, theme scope, step timer', async ({ page }) => {
    const id = await pickRecipe(page, 'recipe')
    await page.goto(`/cook/${id}`)

    await expect(page.locator('.cv-ph-title')).toBeVisible()
    await expect(page.locator('.cv-pane')).toHaveCount(2)
    await expect(page.locator('.cv-step-pane .cv-act-text')).toBeVisible()

    // Kitchen mode retints the whole viewport via <html>, and the toggle flips it.
    const html = page.locator('html')
    const wasDark = await html.evaluate((el) => el.classList.contains('theme-kitchen'))
    await page.locator('.cv-ph-acts .cv-ph-theme button').click()
    await expect(html).toHaveClass(wasDark ? /^(?!.*theme-kitchen)/ : /theme-kitchen/)

    // Countdown: opt-in button starts it, pause holds the time.
    await page.locator('.cv-step-pane').getByRole('button', { name: 'התחל טיימר' }).first().click()
    const clock = page.locator('.cv-clock--timer .cv-clock-time')
    await expect(clock).toBeVisible()
    const t0 = await clock.innerText()
    await expect.poll(() => clock.innerText(), { timeout: 4000 }).not.toBe(t0)
    await page.locator('.cv-clock--timer').getByRole('button', { name: 'השהה' }).click()
    const paused = await clock.innerText()
    await page.waitForTimeout(1500)
    await expect(clock).toHaveText(paused)

    // Done moves the active card to the next step.
    await expect(page.locator('.cv-step-pane .cv-pane-count')).toHaveText(/^0\//)
    await page.locator('.cv-go').click()
    await expect(page.locator('.cv-step-pane .cv-pane-count')).toHaveText(/^1\//)

    // Leaving Cook View removes every page-level class from <html>.
    await page.goto('/recipe-book')
    await expect(html).not.toHaveClass(/theme-kitchen|cv-page-scroll|cv-editing/)
  })

  test('recipe: ×2 doubles the yield and back to ×1 restores it', async ({ page }) => {
    const id = await pickRecipe(page, 'recipe')
    await page.goto(`/cook/${id}`)
    const yieldChip = page.locator('.cv-ph .cv-chip').filter({ hasText: /\d/ }).nth(1)
    const chips = page.locator('.cv-mult-chip')
    await expect(chips).toHaveCount(5)
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true')
    const base = await yieldChip.innerText()
    await chips.nth(2).click()
    await expect(chips.nth(2)).toHaveAttribute('aria-pressed', 'true')
    await expect(yieldChip).not.toHaveText(base)
    await chips.nth(1).click()
    await expect(yieldChip).toHaveText(base)
  })

  test('dish: mise-en-place list without step clocks', async ({ page }) => {
    const id = await pickRecipe(page, 'dish')
    await page.goto(`/cook/${id}`)
    await expect(page.locator('.cv-step-pane .cv-pane-head')).toContainText('מיזאנפלאס')
    await expect(page.locator('.cv-step-pane').getByRole('button', { name: 'התחל טיימר' })).toHaveCount(0)
  })

  test('export preview opens as light paper and closes', async ({ page }) => {
    const id = await pickRecipe(page, 'recipe')
    await page.goto(`/cook/${id}`)
    await page.locator('.cv-ph-acts').getByRole('button', { name: /ייצוא/ }).click()
    const menu = page.locator('.cv-menu').filter({ visible: true })
    await menu.getByRole('button', { name: 'תצוגה' }).first().click()
    const preview = page.locator('app-export-preview')
    await expect(preview.getByRole('button', { name: /הדפסה/ })).toBeVisible()
    await preview.locator('.ep-icon-btn').click()
    await expect(preview.getByRole('button', { name: /הדפסה/ })).toHaveCount(0)
  })

  test('phone: one scrolling page with switch buttons, no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const id = await pickRecipe(page, 'recipe')
    await page.goto(`/cook/${id}`)
    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveCount(2)
    // Ingredients first (right in RTL), steps second; the ingredient card sits above the steps card.
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.cv-body > section').first()).toHaveClass(/cv-ing-pane/)
    await tabs.nth(1).click()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
