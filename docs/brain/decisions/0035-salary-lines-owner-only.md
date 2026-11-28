---
status: accepted
date: 2026-11-24
review-by: 2027-05-24
supersedes: 0032-one-user-more-than-one-business (the consultant bullet of Decision, only for per-employee pay lines)
---

# 0035. Per-employee pay lines are the owner's alone; everyone else gets server-computed totals

## Context

ADR 0032 gave a consultant the owner's rights except the team and the business settings, so he would read every money
record of the business, including per-employee pay once the monthly screen stores it. Pay is personal data under
Israel's privacy law Amendment 13 (whether it is "special sensitivity" data is unresolved, so we take the safe side);
7shifts had a report that leaked wages to managers who should have seen totals only. The month's prime cost needs only
a labour total, not a per-person row.

Sources: the research report `docs/finance/dish-and-month-research.md`, monthly decision N-M3; Dandan's
`approve arch change INV-1`, 2026-11-24 (plan 722).

## Decision

Per-employee pay lines (a person's name or role with a pay amount) are read and written only by the business's own
owner in a home session (a token without `acting`). The server computes the labour totals of a month from them; every
other reader (a consultant, the platform admin acting in the business, staff — staff never see money anyway) receives
only those totals, in the same response shape whether lines exist or not, so a client never holds a per-person row.

The month's typed labour total (monthly slice 3) stays editable by the consultant, as today's money rule allows.
Everything else in ADR 0032 is unchanged.

Rejected:

- Hiding the lines in the browser only: the data still reaches the client.
- Letting the owner choose per consultant: more settings, and the default would leak.
- No per-employee lines at all: some owners want them; they stay late in the build order and owner-only.

## Consequences

- The team-lines route (monthly slice 9) must project totals on the server and gets an `INV-1 …` case in
  `server/test/invariants.test.js`.
- A consultant cannot audit pay by person.
- Payslip capture stays deferred (monthly decision 3).

## Review

Check that no route or export returns a per-person pay row to a non-owner, and whether consultants ask for per-person
access.
