---
name: 270-atlas-performance-fixes
overview: Fix 4 performance bottlenecks causing slow load on Render + Atlas — indexes, blocking sync on refresh, and sequential update writes.
todos: []
isProject: false
---

# Goal
Fix the identified performance bottlenecks causing slow load times on the remote (Render + Atlas) deployment.

# Atomic Sub-tasks
- [ ] Task 1: `server/db.js` — after `mongoose.connect`, add `{ userId: 1 }` index to all 14 CLONEABLE_TYPES collections using `createIndex({ userId: 1 }, { background: true })` plus index `users` collection on `{ name: 1 }` and `{ email: 1 }` (already unique via Mongoose schema, but ensure sparse index for native queries)
- [ ] Task 2: `server/routes/auth.js` `/refresh` endpoint (line 252) — remove `await` from `syncMasterToUser` call so token response is returned immediately; sync runs in background
- [ ] Task 3: `server/services/sync-master.js` — replace sequential `for...of updateOne` loop with a single `col.bulkWrite()` call (batched writes, one Atlas round trip per collection instead of N)

# Rules
- Never commit server/.env
- Indexes use `{ background: true }` so re-index on live Atlas cluster is non-blocking
- Login still awaits syncMasterToUser (data must be ready when client fetches after login)
- Refresh does NOT await sync — 15-min token cycle makes this unacceptable latency

# Done when
- Server starts cleanly (no index-creation errors)
- Login works end-to-end (token returned, data loads)
- Refresh endpoint returns immediately (token returned without sync delay)
- `bulkWrite` replaces sequential `updateOne` loop in sync-master.js
