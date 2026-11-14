import { test, expect } from '@playwright/test'
import { signInQa } from '../helpers/qa-session'

const API = (process.env['E2E_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')

test('600-1: the owner ticks "לשתף דוגמאות", it survives a reload, and unticking restores it', async ({ page, context, request }) => {
  const session = await signInQa(context)
  const headers = { authorization: `Bearer ${session.token}` }
  try {
    await page.goto('/metadata-manager')
    const card = page.locator('#mm-sec-ai-share')
    await expect(card).toContainText('שיתוף דוגמאות AI')
    const chip = card.locator('.c-chip--toggle')
    await expect(chip).toContainText('לשתף דוגמאות')
    const box = chip.locator('input')
    await expect(box).not.toBeChecked()

    await chip.click()
    await expect(box).toBeChecked()
    await page.reload()
    await expect(page.locator('#mm-sec-ai-share .c-chip--toggle input')).toBeChecked()
    await page.screenshot({ path: 'screens/600-1.png' })

    await page.locator('#mm-sec-ai-share .c-chip--toggle').click()
    await expect(page.locator('#mm-sec-ai-share .c-chip--toggle input')).not.toBeChecked()
  } finally {
    await request.put(`${API}/api/v1/business/share-ai-examples`, { headers, data: { share: false } })
  }
})
