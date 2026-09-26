# Session State

## Branch
fix/csp-allow-cloudinary

## Date
2026-09-23

## Session Summary
- User reported image uploads still broken on Render after the prior auth-interceptor fix (`9173e33`, session 2026-09-16), still showing the `image_upload_failed` toast.
- Verified the interceptor fix IS live in the deployed bundle (grepped the minified `main-*.js` for the `isAbsolute` check) — that fix was correct and necessary but not sufficient.
- Reproduced live via the Claude-in-Chrome browser: uploads got HTTP 503 from Cloudinary in the app, while an identical request via `curl` (same headers, same Origin/Referer) got 200. Ruled out a Cloudinary-side outage (status.cloudinary.com clean) and ruled out browser/extension interference by reproducing the exact same failure for `httpbin.org` and `jsonplaceholder.typicode.com` fetches from the same page — i.e. it wasn't Cloudinary-specific.
- Root cause confirmed definitively via the page's own `securitypolicyviolation` event: `{directive: "connect-src", blockedURI: "https://httpbin.org/get", disposition: "enforce"}`. `server/index.js`'s helmet CSP sets `connect-src 'self'` and `img-src 'self' data: blob:` — blocking every cross-origin fetch/XHR (including to `api.cloudinary.com`) and blocking display of `res.cloudinary.com` image URLs, independent of CORS.
- Fixed by adding the two specific Cloudinary hosts to `connect-src` and `img-src` (no wildcard).

## Files Modified
```
 server/index.js | 8 ++++++--
 1 file changed, 6 insertions(+), 2 deletions(-)
```

## Commit
38f9bca (amended to fold session-state + brain entry)

## PR
(filled in after PR creation)

## Next Steps
- None open. If any other third-party integration is added later (another CDN, another direct-upload API), remember this CSP is allowlist-only — add the specific host to `connect-src`/`img-src` in `server/index.js`, don't loosen to a wildcard.
