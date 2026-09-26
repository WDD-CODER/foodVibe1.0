# Session State

## Branch
fix/cloudinary-upload-render

## Date
2026-09-16

## Session Summary
- User reported broken image saving on the Render-deployed app; root-caused via systematic debugging to `auth.interceptor.ts`'s `isOwnBackendRequest` check.
- `environment.prod.ts` (used by `npm run build:render`) sets `apiUrl`/`authApiUrl` to `''` for same-origin deployment; `''.startsWith('')` is always `true`, so the interceptor treated every request — including the direct browser→Cloudinary upload — as "our own backend" and attached the `Authorization` header, which Cloudinary's CORS policy blocks, silently killing the upload.
- Fixed the interceptor to only base-URL-match absolute requests, and treat relative requests (same-origin) as own-backend unconditionally.
- Added user-visible error feedback (`UserMsgService` + existing `image_upload_failed` dictionary key, matching the precedent in `auth-modal.component.ts`) to `recipe-header.component.ts` and `venue-form.component.ts`, which previously swallowed upload failures silently.
- Landed via an isolated `git worktree` (`../foodVibe-cloudinary-fix`) because the original working directory's branch (`chore/perf-quickwins-defer-index-cors`) had already been shipped and the shared tree was mid-flight on unrelated work from another concurrent session.

## Files Modified
```
 src/app/core/interceptors/auth.interceptor.ts                                       | 9 ++++++++-
 src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts    | 7 ++++++-
 src/app/pages/venues/components/venue-form/venue-form.component.ts                  | 5 ++++-
 3 files changed, 18 insertions(+), 3 deletions(-)
```

## Commit
81a9070

## PR
(filled in after PR creation)

## Next Steps
- None open for this fix. If a similar "same-origin base URL" pattern shows up elsewhere (any `url.startsWith(environment.something)` check), audit it against the same empty-string footgun.
