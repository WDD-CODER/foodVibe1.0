import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

test.use({ viewport: { width: 1280, height: 900 } })

test('568-1: /report shows the since-we-started strip once there is one event', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.goto('/report')
    await expect(page.getByRole('heading', { name: 'מאז שהתחלנו' })).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'screens/568-1.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
