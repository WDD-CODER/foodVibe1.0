import { test, expect } from '@playwright/test'
import { signInQa, createQaEvent, deleteQaEvent } from '../helpers/qa-session'

test('623-2: a browser that cannot record shows the paste fallback', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const id = await createQaEvent(request, session)
  try {
    await page.addInitScript(() => {
      delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder
    })
    await page.goto('/menu-intelligence/' + id)
    const panel = page.locator('app-event-logistics-panel')
    await panel.locator('.logistics-toggle').click()
    await panel.getByRole('button', { name: 'מילוי מהערות' }).click()
    await expect(panel.getByText('אי אפשר להקליט בדפדפן הזה – אפשר להדביק או להקליד טקסט')).toBeVisible()
    await page.screenshot({ path: 'screens/623-2.png' })
  } finally {
    await deleteQaEvent(request, session, id)
  }
})
