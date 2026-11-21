import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('639-2: deleting an owner asks whether to erase what was learned too; cancel deletes nothing', async ({
  page,
  context
}) => {
  await signInQa(context)
  let deletes = 0
  await page.route('**/admin/users', (route) =>
    route.fulfill({
      json: [
        {
          _id: 'o-639',
          name: 'דנה',
          email: 'dana639@example.com',
          businessId: 'b-639',
          businessName: 'מטבח 639',
          businessRole: 'owner'
        }
      ]
    })
  )
  await page.route('**/admin/users/o-639*', (route) => {
    deletes += 1
    return route.fulfill({ json: { ok: true, deletedBusiness: true, usersDeleted: 1 } })
  })
  await page.goto('/dashboard?tab=metadata')
  const row = page.locator('.list-item', { hasText: 'מטבח 639' })
  await row.locator('button.c-icon-btn.danger').click()
  await page.getByRole('button', { name: 'הסר', exact: true }).last().click()
  await expect(page.getByText('למחוק גם את מה שהמערכת למדה מהעסק?', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'להשאיר' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'למחוק גם את זה' })).toBeVisible()
  await page.screenshot({ path: 'screens/639-2.png' })
  await page.getByRole('button', { name: 'ביטול' }).last().click()
  expect(deletes).toBe(0)
})
