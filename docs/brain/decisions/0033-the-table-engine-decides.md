---
status: accepted
date: 2026-11-22
review-by: 2027-05-22
---

# 0033. The table engine decides: availability and table assignment are code, and one index guards a table

## Context

Until the Restaurant program a table request was approved by a person and nothing checked capacity: two guests
could be approved for the same table at the same hour. The program adds a floor plan, automatic confirmation, a
public availability read, a waiting list and an assistant that books by chat. Each of them is a new place where
"is there a table" could be answered — by a route that reads the bookings and trusts what it read, by a screen, or
by the AI model in a sentence. Any second answer will sooner or later disagree with the first, and the guest is
told "confirmed" for a table that is taken.

## Decision

1. **One engine.** Whether a party fits at a time, on which table, and what to offer instead is decided only by
   the pure functions of `shared/schemas/front-desk/table-engine.ts`. The server and the browser run the same file.
2. **Same request.** No route confirms, moves or offers a table unless the engine returned it in the same request.
3. **One guard.** Two bookings never hold one table at one time because of the unique index on `tableHolds`
   (`businessId`, `tableKey`, `cell`): a booking is written only after its cells were claimed, and a failed write
   releases them. No route checks by reading first and trusting it.
4. **The owner may override, the index still decides.** An owner may put a booking on a table of his choice
   (`override: true`); the claim must still succeed.
5. **The model never decides.** The AI model only understands what the guest wants and phrases answers. It never
   says whether a table is free, never states a time or a table the engine did not return, and never writes.
6. **Automatic confirmation is the business's switch** (`tableService.confirmMode`), not an assistant level.

## Rejected

- **Capacity counters per hour** (covers by hour): cannot say which table, cannot join tables, and two requests
  can both pass the same counter read.
- **Check, then write, inside a transaction:** the code base uses no transactions, and the free database tier
  makes long ones fragile; a unique index gives the same guarantee with one insert.
- **Letting the model propose a time and validating it afterwards:** one missed validation is a false "confirmed".

## Consequences

- Easier: every channel — the guest page, the host's screen, the waiting list, the chat — gives the same answer.
- Harder: every table write is two steps (claim, then write) with a release on failure; a change of slot length
  must not break old holds, so a hold stores the cell's own time, never a count.
- Accepted: bookings made before the module was switched on have no table; the engine ignores them and a person
  assigns them.

## Review

Check that every route that writes `tableKeys` calls the claim first, and that no file outside the engine computes
availability.
