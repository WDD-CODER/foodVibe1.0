---
status: accepted
date: 2026-11-17
review-by: 2027-05-17
supersedes: 0023-business-is-the-tenant ("one business per user": the Users bullet, lines 27-29, and "The access token carries the business fields")
---

# 0032. One user, more than one business: access grants and an active business

## Context

ADR 0023 made the business the tenant and gave every user exactly one business: `users.businessId`, copied into the
access token, scopes every read and write (INV-1, INV-2). Two people need more than that. A consultant advises several
kitchens and has to work inside each of them: read the invoices, fix prices, build recipes. The platform admin has to
look inside a business to help it. Until now the only way was to share the owner's password. The Human approved
changing INV-1 for this on 2026-11-17 (`approve arch change INV-1`).

## Decision

- A user still has one **home** business (`users.businessId`, `users.businessRole`), exactly as in ADR 0023. Nothing
  about home membership changes.
- A user may also hold **access grants**: rows of the server-only collection `businessAccess`
  (`userId`, `businessId`, `role: 'consultant'`, who granted it and when, who removed it and when). Only the platform
  admin creates a grant. The platform admin or the owner of that business removes it. A removed grant is kept as a row
  with `revokedAt`; one live grant per user and business.
- A user has one **active** business at a time (`users.activeBusinessId`; absent = home). `server/services/access.js`
  `resolveSession(user)` is the one place that decides where a session is: home; a business the user holds a live
  grant for (role `consultant`); or, for a platform admin, any business (role `owner`, marked `acting: 'platform'`).
  Anything else falls back to home and clears the stored value.
- The access token is still signed in one place (`signAccess` in `server/routes/auth.js`) and still carries one
  `businessId`: the **active** business. It also carries `homeBusinessId` and, away from home, `acting`
  (`'consultant'` or `'platform'`). Every existing scoped query keeps working unchanged, because it reads the same
  field. The business is never taken from a request body, a query string or a header.
- `POST /api/v1/auth/switch-business` changes the active business and signs a new token. It is refused (403
  `NO_ACCESS`) without a live grant, unless the caller is the platform admin.
- While a token is `acting`, `verifyToken` checks on every request that the grant is still live (or that the user is
  still the platform admin). A session whose grant was removed is refused on its very next request (401
  `ACCESS_ENDED`), and the next refresh signs a home token.
- A **consultant** may do everything the owner may in that business, except manage the team and change the business
  settings (`CONSULTANT_DENIED` in `server/utils/permissions.js`). The platform admin acting in a business has the
  owner's rights there. What only the platform admin sets from outside (modules, AI cap, private mode, front desk
  status) stays outside.
- Every stamp keeps the real person: `createdBy` and `actorOf(req)` are the user's own id and name, never the
  owner's. `businessId` on a created item is the active business.
- An acting session is not the business's own activity: `usageDays` is not written for it. AI usage is still charged
  to the business the call was made in.

## Rejected

- A second account per business for the same person: several passwords, and the stamps no longer say who did the work.
- Sending the business in a header or a body field on each request: every route would have to check it, and one
  missed check would open another kitchen. The business stays in the token the server signed.
- Making the consultant a staff member of each client business: staff cannot change prices, which is the consultant's
  job, and a user document holds one business.
- Trusting the token until it expires (15 minutes) after a grant is removed: an owner who removes access expects it
  to end now.

## Consequences

- INV-1 gains one sentence: who may read and write a business, and where the business comes from. INV-2 is unchanged:
  the business is still the tenant and every scoped query still goes through `server/utils/business-scope.js`.
- An acting request costs one extra indexed read. A home request costs nothing extra.
- A user who logs in again lands in the business that was active last; the screen always says so (plan 632).
- A grant gives the owner's view of prices and clients. Granting is therefore the platform admin's act, logged with
  ids, and the owner sees the list of who has access and can remove anyone on it.
- `write-limit.js` and the client log route read the token without the grant re-check. Neither reads or writes
  business data: the write limit is counted against the real user, and a client log line carries the real user id.

## Review

Check whether any route takes a business from anywhere but the token, whether owners remove grants and what happens
to work in flight, and whether a consultant needs a right this ADR refuses (team, settings).
