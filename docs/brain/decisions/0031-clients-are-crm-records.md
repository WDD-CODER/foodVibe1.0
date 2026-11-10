---
status: accepted
date: 2026-11-10
review-by: 2027-05-10
supersedes: 0027-client-entity-above-events (staff read fields, lines 26-29; soft delete, lines 31-32)
---

# 0031. Clients are CRM records: soft delete, a phone match key, server-owned history fields

## Context

ADR 0027 made the client a record above events, owner-only to write, read by staff as name and phone, and deleted
for good. The Front Desk program turns that record into the business's customer list: requests, bookings, events and
(later) conversations all point at it, and the public page and WhatsApp create clients without a member typing them.
A CRM that loses a customer and their history on one tap, or keeps two records for one person because one channel
sends `05…` and another `9725…`, cannot be trusted. On 2026-11-10 the Human decided: clients stay owner-only to
write (D2), are soft-deleted (D3), and staff may read tags and kinds (D2).

## Decision

- `clients` is a soft-delete type (`softDelete: true`): a delete stamps `deletedAt`, Trash lists the client, restore
  brings it back, and the 30-day purge removes it for good. Events keep their `clientName` / `clientPhone` snapshot,
  so an event whose client was purged still shows who it was for.
- A client carries optional CRM fields: `kinds` (diner, event client, lead), `tags` (reserved: `vip`, `allergy`,
  `repeat_no_show`), `lifecycle`, `firstSeenAt`, `lastContactAt`, `counters`, `consent`, `language`, `waId`,
  `mergedInto` and `doNotContact`.
- `phoneKey` is the match key for one person across channels: the last 9 digits of `phoneNormalized` when it has at
  least 9, else all of them. It is derived by the server on every write, like `phoneNormalized`.
- The server alone writes `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`,
  `counters`, `waId`, `mergedInto` and `doNotContact` (`CLIENT_SERVER_FIELDS`); the generic API drops them from
  every write. `doNotContact` is set only by a dedicated clients route or the assistant's removal intent.
- Duplicates are never resolved by delete: one live, unmerged client per `phoneKey` is kept by the server's
  find-or-create, and existing duplicates are joined by a merge that stamps `mergedInto`.
- Staff read `name`, `phone`, `tags` and `kinds` (plus the base fields). Everything else stays owner-only to read.
- `liveKey` (server-only, = `phoneKey` while the client is live and not merged; removed on delete and merge) carries a unique partial index `{ businessId, liveKey }`, so the database itself keeps one live client per phone (plan 545).
- Unchanged from ADR 0027: only the owner creates, edits or deletes a client directly; a staff member causes a client
  only through a request the server turns into one. `createdBy` is stamped on every client, so letting staff add
  clients later is a permissions change with no data migration.

## Rejected

- A separate `guests` / `contacts` / `leads` collection beside `clients` (two lists of the same people).
- A unique database index on the phone: a trashed or merged client keeps its phone, so restore and merge would
  collide; uniqueness is checked over live, unmerged clients instead, and a restore that would collide is refused
  (`PHONE_TAKEN`).
- Letting staff create and edit clients now (decided against on 2026-11-10; kept cheap to open later).

## Consequences

- Migration 0011 backfills `phoneKey`, `kinds`, `firstSeenAt` and the event counter for existing clients and lists,
  without changing them, any clients that share a `phoneKey`.
- A purged client leaves its events with a `clientId` that no longer resolves; screens fall back to the snapshot.
- Staff now see tags; an owner who writes something private in a tag shows it to staff.

## Review

Check whether owners ask for staff to add clients, and whether the `phoneKey` rule ever joins two different people.
