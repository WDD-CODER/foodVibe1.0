---
status: accepted
date: 2026-10-20
review-by: 2027-04-20
supersedes: 0008-professional-foundation-refactor (D1 only)
---

# 0023. The business is the tenant: every item has one `businessId` and a `createdBy`

## Context

Plan 424 (spec 01.1, first of 424 -> 425 -> 426). Every document had one owner field, `userId`; every user
got a private clone of `__master__` at signup (`cloneMasterDataToUser`); and there was one global
`role` (`admin` / `user`). An owner and a staff member could therefore never share one kitchen's data, and
"admin" meant both "runs my kitchen" and "edits the shared catalog".

ADR 0008 D1 planned shared master data plus per-user overrides ("change/remove only for me"). Plan 386
retired that plan; it was never built.

## Decision

- **The business is the clone unit and the tenant.** A new business gets its own full copy of the
  `__master__` catalog. Owner and staff of one business read and write that one copy.
- **Every item carries `businessId` and `createdBy`** (`baseDocShape`). Master items carry
  `businessId: '__master__'`. The server stamps both on every create (POST, replace-all, signup clone,
  login sync, push-to-master, seed); a client can never set or change them (stripped like `userId`).
- **Users** get `businessId`, `businessRole` (`owner` | `staff`), `isPlatformAdmin`, `removedAt`,
  `createdAt`. `isPlatformAdmin` (not `role`) is the platform power; only a platform admin writes
  `__master__`. The access token carries the business fields. Signup creates the user's business.
- **`businesses` collection**, one document per business (`businessSchema`, Zod). It is not reachable
  through the generic data pipe; plan 425 adds a dedicated router.
- **One scoping path:** `server/utils/business-scope.js` (`scopeFilter`, `readScope`, `stampNew`).
  **One write-permission path:** `server/utils/permissions.js` (plan 427).
- **Migration 0006** gives every existing user a business "העסק של <username>" and stamps every item.
- **Transition:** this plan adds the fields and stamps them but reads and writes still filter by
  `userId`. Plan 425 switches the filters to `businessId` and makes the fields required.

Rejected: per-user and per-business private overrides of shared data (out of the MVP).

## Consequences

Who loses what (INV-1 / INV-2 change, approved by Dandan 2026-10-20): the never-built "per-user override
of shared data" (ADR 0008 D1) is dropped. A staff member cannot keep private changes; owner and staff
always see the same copy (spec 01.1, minimal version).

- INV-1 (Ownership) and INV-2 (Tenancy) in `docs/brain/invariants.md` are rewritten around the business.
- Until plan 425 the new fields are inert, so merging this plan alone changes nothing a user sees.
- Rollback: the fields and the `businesses` collection are unread while queries scope by `userId`;
  a full undo is restoring the pre-migration Atlas snapshot.
