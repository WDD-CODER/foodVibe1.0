import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('639-1: the erase button in the business dialog opens a confirm popup that names the business', async ({
  page,
  context
}) => {
  await signInQa(context)
  await page.route('**/admin/businesses/*/erase-learned', (route) =>
    route.fulfill({
      json: {
        ok: true,
        counts: { promoted: 0, drafts: 0, aliasesPulled: 0, aliasesDeleted: 0, profilesPulled: 0, profilesDeleted: 0 }
      }
    })
  )
  await page.goto('/platform')
  await page.locator('[data-testid="biz-edit"]').first().click({ force: true })
  await expect(page.locator('[data-testid="biz-dialog"]')).toBeVisible()
  const erase = page.locator('[data-testid="biz-erase-learned"]')
  await expect(erase).toHaveText('מחיקת מה שנלמד מהעסק')
  await erase.click()
  await page.locator('[data-testid="biz-erase-reason"]').fill('בקשת העסק')
  await page.locator('[data-testid="biz-erase-confirm"]').click()
  const popup = page.locator('.confirm-modal-message')
  await expect(popup).toContainText('למחוק את כל מה שנלמד מ-')
  await page.screenshot({ path: 'screens/639-1.png' })
  await page.getByRole('button', { name: 'ביטול' }).last().click()
  await expect(popup).toHaveCount(0)
})
