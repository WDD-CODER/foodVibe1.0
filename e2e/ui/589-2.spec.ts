import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('589-2: a shared /cook/<id> link opens without signing in', async ({ browser, request, page }) => {
  const seedCtx = await browser.newContext()
  let id = ''
  try {
    const session = await signInQa(seedCtx)
    const api = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
    const res = await request.get(`${api}/api/v1/data/recipes`, { headers: { authorization: `Bearer ${session.token}` } })
    const body = await res.json()
    const list: { _id: string }[] = Array.isArray(body) ? body : (body.data ?? body.items ?? [])
    id = list[0]?._id ?? ''
  } finally {
    await seedCtx.close()
  }
  test.skip(!id, 'no QA recipe')
  await page.goto(`/cook/${id}`)
  await expect(page).toHaveURL(new RegExp(`/cook/${id}$`))
  await expect(page.locator('.cv-ph-title')).toBeVisible()
  await page.screenshot({ path: 'screens/589-2.png' })
})
