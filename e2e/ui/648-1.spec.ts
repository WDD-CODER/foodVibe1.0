import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

test('648-1: the centre of "שמירת טיוטה" is that button', async ({ page, context }) => {
  await signInQa(context)
  await page.goto('/inventory/count')
  const save = page.getByTestId('stk-save-draft')
  await expect(save).toBeVisible()
  await expect(save).toContainText('שמירת טיוטה')
  const isSaveOnTop = await save.evaluate((el) => {
    const box = el.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return !!hit && el.contains(hit)
  })
  expect(isSaveOnTop).toBe(true)
  await page.screenshot({ path: 'screens/648-1.png' })
})
