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

/**
 * Answers the app's session refresh on the page itself. The sweep installs its read-only guard on the context after
 * this sign-in, and the newest context route runs first: the guard aborts the refresh POST before seedQaContext's
 * stand-in answer is reached, the app then clears the session and every page is measured as /welcome (plan 739).
 * A page route runs before any context route, so the refresh is answered here and the guard still blocks every
 * other write.
 */
function answerRefreshOnPages(context, session, appOrigin) {
  const headers = {
    'access-control-allow-origin': appOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'POST, OPTIONS'
  }
  const answer = (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ token: session.token }) })
  }
  const attach = (page) => page.route('**/api/v1/auth/refresh', answer)
  for (const page of context.pages()) void attach(page)
  context.on('page', (page) => void attach(page))
}

export async function signIn(context, { appOrigin, apiOrigin }) {
  pending ??= login(apiOrigin)
  const session = await pending
  await seedQaContext(context, session, appOrigin)
  answerRefreshOnPages(context, session, appOrigin)
  withApiAuth(context.request, apiOrigin, session.token)
}
