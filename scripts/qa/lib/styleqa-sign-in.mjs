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

/**
 * Wraps request.get so a call to the API origin carries the bearer token; other origins stay untouched.
 * Not setExtraHTTPHeaders: that would also hit page requests (cross-origin fonts would need a preflight).
 */
export function withApiAuth(request, apiOrigin, token) {
  const original = request.get.bind(request)
  request.get = (url, opts = {}) => {
    if (!String(url).startsWith(apiOrigin)) return original(url, opts)
    return original(url, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${token}` } })
  }
  return request
}

export async function signIn(context, { appOrigin, apiOrigin }) {
  pending ??= login(apiOrigin)
  const session = await pending
  await seedQaContext(context, session, appOrigin)
  withApiAuth(context.request, apiOrigin, session.token)
}
