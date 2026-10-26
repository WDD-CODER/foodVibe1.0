---
status: accepted
date: 2026-10-22
review-by: 2027-04-22
supersedes: 0023-business-is-the-tenant (member read rule for events only)
---

# 0026. Staff read events only in the stages the owner chose, plus the events they created

## Context

Review handoff `docs/mvp/review-handoff-2026-10-21.md` item I2, decision D11: the owner wants early inquiries and
quotes to stay between him and the client, so he picks which event stages his cooks see. Until now INV-1 (ADR 0023)
said "members read all of their business's items" and no stage filter existed anywhere (verified on `mvp`).
The Human approved the INV-1 change in chat on 2026-10-21 (`approve arch change INV-1`), with the recommended answers:
default = every stage (no change until the owner unticks one) and staff always see events they created.

Alternatives: hide in the client only (rejected — a cook could still open a hidden event by link or see it counted
on the dashboard); a fixed rule "cooks never see inquiries" (rejected — the code never did that and owners differ);
per-staff-member lists (out of scope for the MVP).

## Decision

- The business document carries an optional `staffVisibleStages: EventStage[]`. Absent = every stage.
- Only the owner sets it (`PUT /api/v1/business/staff-visible-stages`, `editSettings`).
- For a staff member, every server route that returns or acts on events (`/api/v1/data/menuEvents` list, `/:id`,
  `/count`, `/trash`, by-id writes, bulk delete, restore; every `/api/v1/events/:id/*` action; the dashboard stats)
  answers as if an event were absent unless its stage (missing stage = `inquiry`) is in the list or he created it.
- The rule lives in one file, `server/utils/event-visibility.js`, in two forms (Mongo filter and in-memory check)
  with a test that they agree. Owners, the platform-admin routes, every other item type and every write rule
  (C-PERM) are unchanged.

## Consequences

- A cook's lists, counts and dashboard funnel can show fewer events than the owner's; a funnel may read 0 inquiries.
- If the owner unticks a stage a cook is working in, the cook loses that event (404 on the next load or save) until
  the owner ticks it again or moves the event. The menu editor shows `event_not_available` and returns to the library.
- One extra `businesses.findOne` per staff request that touches events; no cache, so an owner's change applies on
  the cook's next request.
- `staffVisibleStages` is readable by every member through `GET /api/v1/business` (it names stages, not events).

## Review

Check whether owners use the card, whether cooks report missing events they needed, and whether the per-request
business read shows up in the staff request timings (`data.query.perf`).
