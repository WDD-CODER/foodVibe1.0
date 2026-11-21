import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
const SUPPLIER_NAME = 'ספק בדיקה 628'
/** A 1-pixel PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

test('628-1: a chosen image shows the header strip with the supplier of the read', async ({
  page,
  context,
  request
}) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  const created = await request.post(`${API}/api/v1/data/suppliers`, { headers, data: { nameHebrew: SUPPLIER_NAME } })
  expect(created.ok()).toBeTruthy()
  const body = await created.json()
  const supplierId = (body._id ?? body.data?._id) as string
  try {
    await page.route('**/api/v1/ai/invoices/read', (route) =>
      route.fulfill({
        json: {
          header: { supplierName: SUPPLIER_NAME, invoiceNumber: 'INV-628', invoiceDate: '2026-11-01' },
          supplier: { supplierId, matchedBy: 'name', supplierKey: 'name:' + SUPPLIER_NAME },
          rows: [
            {
              name: 'מוצר בדיקה 628',
              baseUnit: 'kg',
              price: 5,
              purchaseUnit: null,
              purchaseQty: null,
              category: null,
              needsReview: false,
              duplicate: false
            }
          ],
          printed: [],
          truncated: false,
          draftId: null,
          fileId: null
        }
      })
    )
    await page.route('**/api/v1/product-import/resolve', (route) => route.fulfill({ json: { matches: [] } }))
    await page.route('**/api/v1/ai/match-product-names', (route) => route.fulfill({ json: { matches: [] } }))
    await page.goto('/inventory/import')
    await page.locator('[data-testid="import-photo-upload-input"]').setInputFiles({
      name: 'invoice.png',
      mimeType: 'image/png',
      buffer: PNG
    })
    await expect(page.locator('[data-testid="invoice-strip"]')).toContainText(SUPPLIER_NAME)
    await page.screenshot({ path: 'screens/628-1.png' })
  } finally {
    await request.delete(`${API}/api/v1/data/suppliers/${supplierId}`, { headers })
  }
})
