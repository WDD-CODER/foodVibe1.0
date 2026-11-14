/**
 * Style QA sign-in (styleqa.signIn): signs the QA user in once and seeds each browser context the same way the
 * evidence server and Code QA do (qa-login.mjs). Credentials come from server/.env; nothing is printed.
 * One shared login promise, so contexts opened at the same time never log in twice; one retry on a dropped socket.
 */
import { loginQa, seedQaContext } from './qa-login.mjs'

let pending = null

async function login(api) {
  try {
    return await loginQa({ api })
  } catch (e) {
    if (!/fetch failed/.test(String(e?.message))) throw e
    await new Promise((r) => setTimeout(r, 1500))
    return loginQa({ api })
  }
}

export async function signIn(context, { appOrigin, apiOrigin }) {
  pending ??= login(apiOrigin)
  await seedQaContext(context, await pending, appOrigin)
}
