# Pattern: Mongo bulk replace — transaction first, pending-flag swap when standalone rejects it

## Problem

A "delete then insert" bulk replace (e.g. `PUT /:type` in `server/routes/generic.js`)
has a window where a crash or error between the delete and the insert leaves the user
with an empty collection instead of their old or new data. A real Mongo transaction
closes that window — but transactions require a replica set, and local/standalone dev
Mongo isn't one; Atlas (prod) always is, so a transaction-only implementation looks
correct in review and in prod, then breaks in local dev.

## Solution

1. Try `mongoose.connection.startSession()` + `session.withTransaction(async () => {
   deleteMany(...); insertMany(...) })`, passing `{ session }` to both calls.
2. Catch the transaction error and check for standalone rejection specifically:
   `err.code === 20` or `/replica set|mongos/i.test(err.message)` — that's Mongo's
   "Transaction numbers are only allowed on a replica set member or mongos" signature.
3. On that specific error, fall back to a pending-flag swap: insert the new docs first
   with a marker field (e.g. `_pendingReplace: true`), `deleteMany` the old (unflagged)
   docs, then `updateMany` to clear the marker. Any other transaction error is a genuine
   abort — surface it as a 500, don't silently fall back.
4. The fallback isn't fully atomic (a crash mid-swap can leave a stray marker field or a
   brief duplicate window) but it never leaves the collection empty — acceptable when a
   real transaction can't be assumed.

## When to use

Any multi-document write in this backend that must survive a mid-request crash without
data loss, on a codebase that has to run against both a replica set (Atlas/prod) and
standalone Mongo (local dev). Don't reach for this if the deployment is guaranteed to
always be a replica set — a plain transaction with no fallback is simpler and correct.

See also: [[flipping-a-blocklist-to-an-allowlist-without-reconciling-callers]]
