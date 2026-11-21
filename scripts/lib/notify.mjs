/**
 * A desktop notice for the Human when a run waits on an answer. Node built-ins only; never throws, never waits.
 *
 *   import { notifyHuman } from './lib/notify.mjs'
 *   notifyHuman({ title: 'Run <run>: plan <NNN> asks (scope)', text: 'May the builder write …?' })
 *
 * Windows: one detached `powershell.exe -NoProfile -NonInteractive -EncodedCommand <fixed script>` that shows a toast
 * (Windows.UI.Notifications, ToastText02, PowerShell's own app id). The texts reach the script only through the
 * ORCH_TOAST_TITLE / ORCH_TOAST_TEXT environment variables: the script itself is a constant, so no question text is
 * ever parsed as PowerShell. Off when ORCH_NOTIFY=off, when CI or NODE_TEST_CONTEXT is set, and on every other
 * platform (returns false).
 *
 * Phone push: when ORCH_PUSH_URL (an ntfy topic URL, a secret kept in .env) is set, the same notice is also sent as one
 * plain-text POST (Title and Tags headers, 5-second timeout, text redacted). Same off switches; a failed or slow
 * request is swallowed; the URL is never logged. See pushHuman.
 */
import { spawn as nodeSpawn } from 'node:child_process'
import { redact } from './brain-doc.mjs'

const APP_ID = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
export const TOAST_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  '[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]',
  '$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)',
  '$t = $xml.GetElementsByTagName("text")',
  '[void]$t.Item(0).AppendChild($xml.CreateTextNode($env:ORCH_TOAST_TITLE))',
  '[void]$t.Item(1).AppendChild($xml.CreateTextNode($env:ORCH_TOAST_TEXT))',
  `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${APP_ID}').Show([Windows.UI.Notifications.ToastNotification]::new($xml))`,
].join('; ')

/** The spawn arguments of the toast (exported for the tests). */
export function toastCommand({ title, text }, env = process.env) {
  const encoded = Buffer.from(TOAST_SCRIPT, 'utf16le').toString('base64')
  return {
    file: 'powershell.exe',
    args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
    options: { detached: true, stdio: 'ignore', windowsHide: true, env: { ...env, ORCH_TOAST_TITLE: String(title ?? '').slice(0, 120), ORCH_TOAST_TEXT: String(text ?? '').slice(0, 400) } },
  }
}

const PUSH_TIMEOUT_MS = 5000
const switchedOff = (env) => String(env.ORCH_NOTIFY ?? '').toLowerCase() === 'off' || Boolean(env.CI) || Boolean(env.NODE_TEST_CONTEXT)

/** Sends the notice to ORCH_PUSH_URL; resolves true when the server accepted it, false otherwise. Never throws, never logs the URL. */
export async function pushHuman({ title, text }, { env = process.env, fetch: doFetch = globalThis.fetch } = {}) {
  try {
    const url = String(env.ORCH_PUSH_URL ?? '').trim()
    if (!url || switchedOff(env) || typeof doFetch !== 'function') return false
    const res = await doFetch(url, {
      method: 'POST',
      headers: { Title: redact(String(title ?? '')).replace(/[\r\n]+/g, ' ').slice(0, 120), Tags: 'robot' },
      body: redact(String(text ?? '')).slice(0, 600),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    })
    return Boolean(res?.ok)
  } catch {
    return false
  }
}

/** Shows the notice (and sends the phone push); true when the desktop notice was started. `spawn`, `platform` and `fetch` are for the tests. */
export function notifyHuman(msg, { platform = process.platform, env = process.env, spawn = nodeSpawn, fetch: doFetch } = {}) {
  try {
    // NODE_TEST_CONTEXT: under node --test (and the runs a test starts), no notice ever pops up on the machine.
    if (switchedOff(env)) return false
    if (env.ORCH_PUSH_URL) pushHuman(msg, { env, fetch: doFetch }).catch(() => {})
    if (platform !== 'win32') return false
    const c = toastCommand(msg, env)
    const child = spawn(c.file, c.args, c.options)
    child?.on?.('error', () => {})
    child?.unref?.()
    return true
  } catch {
    return false
  }
}
