# Architecture invariants

The load-bearing runtime rules of FoodVibe, as a checklist. ADRs in `decisions/` keep the
reasoning; this file is what the gate checks. Format and enforcement:
[[0017-architecture-invariants-gate]].

Enforced from plan: 388

Every plan fills `## Architecture Impact` with one line per invariant its scope touches
(`node scripts/scope-check.mjs --arch --plan=<p>` blocks a plan that doesn't). Changing or
deviating from a rule needs the Human's explicit `approve arch change INV-n` in chat, an
`Arch-approved: Human YYYY-MM-DD` line, and for a change, a superseding ADR.

Each section below is parsed by `scripts/lib/invariants.mjs` — keep the exact shape:
`## INV-n — <title>`, then the five `- Field:` lines. `Touches` globs are backticked.

## INV-1 — Ownership
- Rule: every user can create, edit and delete his own items; the admin can also do so for shared `__master__` items. Write routes authorize through `server/utils/can-write.js`.
- Source: ADR 0019 (plan 386), `server/utils/can-write.js`
- Touches: `server/routes/generic.js`, `server/utils/can-write.js`, `server/middleware/**`, `src/app/core/services/permission.service.ts`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/*-data.service.ts`
- Users lose if broken: a cook can't change or delete his own recipes and products, or can change someone else's; the admin can't fix the shared default lists.
- Test: server/test/invariants.test.js "INV-1 …"

## INV-2 — Tenancy
- Rule: shared master data plus per-user overrides, created lazily on "change/remove only for me". A user's ability to customize shared data is never removed without a replacement in the same release.
- Source: ADR 0008 D1 + ADR 0019 (plan 386)
- Touches: `server/routes/generic.js`, `server/services/**`, `server/migrations/**`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/master-push.service.ts`
- Users lose if broken: a cook can no longer hide or rename a default category, unit or label for himself — he's stuck with the shared list, or his change leaks to everyone.
- Test: server/test/invariants.test.js "INV-2 …"

## INV-3 — The server owns cross-document consistency
- Rule: renames that re-key references and cascading updates run on the server in one request. The client never loops one write per document.
- Source: plan 385
- Touches: `src/app/core/services/kitchen-state.service.ts`, `src/app/pages/metadata-manager/**`, `server/routes/generic.js`
- Users lose if broken: renaming a category half-finishes — some recipes keep the old name — and big renames hit the write limit and fail.
- Test: none

## INV-4 — One Zod schema package, the server validates every write
- Rule: entity shapes are defined once in `shared/schemas`, and the server validates every write against them.
- Source: ADR 0008 D2
- Touches: `shared/schemas/**`, `server/middleware/validate.js`, `server/utils/schema-check.js`
- Users lose if broken: broken or half-filled items get saved and later crash screens or show wrong costs.
- Test: server/test/invariants.test.js "INV-4 …"

## INV-5 — Taxonomy
- Rule: all terms (categories, units, labels, …) live in the `taxonomyTerms` collection; course, protein and labels are separate axes.
- Source: ADR 0008 D3
- Touches: `shared/schemas/entities/taxonomy-term.schema.ts`, `src/app/core/services/*registry*.service.ts`, `src/app/core/services/taxonomy-store.service.ts`
- Users lose if broken: filters and dropdowns show mixed-up or duplicate lists, and a term edited in one place doesn't change in another.
- Test: none

## INV-6 — AI calls only through the server
- Rule: every Gemini call goes through `server/routes/ai.js`; the browser never holds an AI key.
- Source: AGENTS.md hard rules
- Touches: `server/routes/ai.js`, `src/app/**/*ai*`
- Users lose if broken: the AI key leaks to anyone who opens the browser tools, and anyone can run up the bill.
- Test: none
