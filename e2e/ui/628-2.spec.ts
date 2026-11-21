import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('628-2: the invoices page lists a saved invoice', async ({ page, context }) => {
  await signInQa(context)
  await page.route('**/api/v1/data/invoices*', (route) =>
    route.fulfill({
      json: [
        {
          _id: 'inv-628',
          schemaVersion: 2,
          businessId: 'b',
          createdBy: 'u',
          createdAt: 1_763_000_000_000,
          updatedAt: 1_763_000_000_000,
          supplierName: 'ספק בדיקה 628',
          invoiceNumber: 'INV-628',
          invoiceDate: '2026-11-01',
          source: 'photo',
          lines: []
        }
      ]
    })
  )
  await page.goto('/inventory/invoices')
  await expect(page.getByRole('heading', { name: 'חשבוניות' })).toBeVisible()
  await expect(page.locator('[data-testid="invoice-row"]', { hasText: 'INV-628' })).toBeVisible()
  await page.screenshot({ path: 'screens/628-2.png' })
})
