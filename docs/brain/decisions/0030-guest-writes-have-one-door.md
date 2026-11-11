---
status: accepted
date: 2026-11-10
review-by: 2027-05-10
---

# 0030. Guest writes have one door

## Context

Until now every write to FoodVibe came from a signed-in member: it passed `verifyToken` and was authorized by
`server/utils/permissions.js` (INV-1). The Front Desk program lets a business's customers send a request from a
public page and later from WhatsApp, without an account. Those people are not members of any business, so they need a
way in that does not exist today. The Human approved changing INV-1 for this on 2026-11-10 (`approve arch change
INV-1`). The door is opened once, with its lock, before any feature uses it.

## Decision

- Guest-originated writes enter only through `server/routes/public.js` (`/api/v1/public`) and
  `server/routes/webhooks-whatsapp.js` (`/api/v1/webhooks/whatsapp`). The business is resolved by the server (slug →
  `frontDeskProfiles`; phone-number id → profile `whatsapp.phoneNumberId`), never taken from the body.
- Stamps: `createdBy: 'public:form' | 'public:whatsapp'` (`guestActor` in `server/utils/actor.js`), `businessId` = the
  resolved business. Member stamps take their actor only from `actorOf(req)` in the same file.
- Read-back only by an unguessable token: `publicToken` = 24 random bytes, base64url (32 characters,
  `server/utils/public-token.js`); a token names exactly one request or booking.
- `server/middleware/rate-limit.js` exports `publicLimiter` (20 writes / 15 min per IP + slug). The honeypot field
  `website` (`server/middleware/honeypot.js`) answers a silent 201 with no write.
- Guest text is stored as plain text and never rendered as HTML.
- No member token is read under `/api/v1/public`: the router never loads the auth middleware, so a member who calls it
  gets nothing extra and no usage is recorded.

## Rejected

- Guest writes through `/api/v1/data` with an anonymous role: it would mix the member permission rules with a stranger's
  writes in one router and make every generic route a public surface.
- A guest account per customer: customers will not sign up to send one request, and every account is a login to secure.
- Trusting a `businessId` sent by the page: anyone could write into any business by changing one field.

## Consequences

- Every later public route adds its own rate limit (`publicLimiter`), the honeypot and its own input schema in the same
  plan that adds it; no public route ships without its rate limit.
- The read-back token is a bearer secret: it is never logged (log a request id instead).
- INV-1 now names two kinds of writer: members, through `permissions.js`, and guests, through the two doors above.

## Review

Check whether the per IP + slug budget stops abuse without blocking real customers, and whether any write reached a
business through a path other than the two doors.
