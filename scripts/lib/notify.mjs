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
 */
import { spawn as nodeSpawn } from 'node:child_process'

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

/** Shows the notice; true when it was started. `spawn` and `platform` are for the tests. */
export function notifyHuman(msg, { platform = process.platform, env = process.env, spawn = nodeSpawn } = {}) {
  try {
    // NODE_TEST_CONTEXT: under node --test (and the runs a test starts), no notice ever pops up on the machine.
    if (String(env.ORCH_NOTIFY ?? '').toLowerCase() === 'off' || env.CI || env.NODE_TEST_CONTEXT || platform !== 'win32') return false
    const c = toastCommand(msg, env)
    const child = spawn(c.file, c.args, c.options)
    child?.on?.('error', () => {})
    child?.unref?.()
    return true
  } catch {
    return false
  }
}
