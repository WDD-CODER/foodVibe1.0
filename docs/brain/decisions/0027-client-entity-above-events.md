---
status: accepted
date: 2026-11-02
review-by: 2027-05-02
supersedes: 0023-business-is-the-tenant (INV-1 member rule, for the clients collection only)
superseded-in-part-by: 0031-clients-are-crm-records (staff read fields; soft delete)
---

# 0027. The client is a record above events; only the owner writes it and staff read name and phone

## Context

A client was two loose strings on each menu event (`clientName`, `clientPhone`). A returning client was retyped on
every event, so nothing could be grouped or looked up per client. Plan 512 starts the CRM chain (migration, data
layer, inquiry dialog, stage bar). The Human approved the INV-1 deviation on 2026-11-01 (`Arch-approved: Human
2026-11-01` in plan 512): the owner wants client relationships to stay between him and the client.

Alternatives: keep the strings and group at read time (rejected: no stable id, no place for email, notes or type);
let staff create clients (rejected for now: a later plan may decide staff client creation).

## Decision

- Client = who, event = what. The `clients` collection holds one record per person or company; `menuEvents.clientId`
  points at it. The stage stays on the event, never on the client.
- `clients` is owner-only to write: staff `create`, `edit` and `delete` get 403 (`OWNER_ONLY_TYPE` in
  `server/utils/permissions.js`), even for a record they created.
- Staff read clients through a server projection limited to `name` and `phone` plus the base fields
  (`STAFF_READ_FIELDS` in `shared/schemas/staff-fields.ts`, `staffProjection` in `permissions.js`, applied in
  `generic.js` GET `/` and `/:id`). `email`, `notes`, `source`, `clientType`, `companyName` and `phoneNormalized`
  are owner-only to read.
- `phoneNormalized` is the digits of `phone`, derived by the server on every write; a client-sent value is ignored.
- `clients` is scoped by `businessId` through `scopeFilter`, is `cloneable: false`, carries no `_masterId` or
  `_userModified`, and has `softDelete: false` (hard delete, no Trash, no delete UI in the first release).
- `clientName` and `clientPhone` stay on the event as a snapshot. There is no rename cascade yet: renaming a client
  does not change the snapshots on its events.
- Migration 0009 (a later plan) groups existing events by `phoneNormalized`, then by trimmed `clientName` when an
  event has no phone.

## Consequences

- INV-1 is narrower for clients than the rule: staff cannot create, edit or delete a client, and they see
  two fields. Staff open inquiries only for clients the owner added.
- A new generic projection hook exists (`staffProjection`): any later type can be trimmed for staff by adding an
  entry to `STAFF_READ_FIELDS`.
- A client record and an event's snapshot can differ until a later plan adds the rename cascade.

## Review

Check whether owners ask for staff to add clients, and whether the snapshot drift is reported as a problem.
