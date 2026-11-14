import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('589-2: signed-out /cook/<id> lands on /welcome; sign-in returns to the recipe', async ({ browser, request, page }) => {
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
  await expect(page).toHaveURL(/\/welcome\?returnUrl=/)
  await page.screenshot({ path: 'screens/589-2.png' })

  // Signing in (a QA session) then following the welcome link returns to the recipe.
  const context = await browser.newContext()
  try {
    const qaPage = await context.newPage()
    await signInQa(context)
    await qaPage.goto(`/welcome?returnUrl=${encodeURIComponent(`/cook/${id}`)}`)
    await expect(qaPage).toHaveURL(new RegExp(`/cook/${id}$`))
    await expect(qaPage.locator('.cv-ph-title')).toBeVisible()
  } finally {
    await context.close()
  }
})
