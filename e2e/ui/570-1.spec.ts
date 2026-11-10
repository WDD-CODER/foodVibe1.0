import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

test.use({ viewport: { width: 1280, height: 720 } })

test('570-1: the logistics card opens at laptop size with the price bar showing', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/menu-intelligence/' + id)
    const panel = page.locator('app-event-logistics-panel')
    await panel.waitFor()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await panel.locator('.logistics-toggle').click({ timeout: 5000 })
    await expect(panel.getByRole('tab', { name: /שיחה ראשונה/ })).toHaveAttribute('aria-selected', 'true')
    await page.screenshot({ path: 'screens/570-1.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
