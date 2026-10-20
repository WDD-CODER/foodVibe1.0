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
- Rule: every item belongs to exactly one business. Members read all of their business's items and nothing from another business; every write is authorized through `server/utils/permissions.js` (`can` / `assertCan`): the owner may do everything in the business, staff create anything but change only what they created and never money fields, business settings, the team or event/serving types (until plan 427 merges every member counts as owner). Only a platform admin writes shared `__master__` items.
- Source: ADR 0023 (plan 424), `server/utils/business-scope.js`, `server/utils/permissions.js`
- Touches: `server/routes/generic.js`, `server/utils/business-scope.js`, `server/utils/permissions.js`, `server/middleware/**`, `src/app/core/services/permission.service.ts`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/*-data.service.ts`
- Users lose if broken: a cook sees or changes another kitchen's recipes and prices, or a staff member changes prices, settings or the team that only the owner may change; the platform admin can't fix the shared default lists.
- Test: server/test/invariants.test.js "INV-1 …"

## INV-2 — Tenancy
- Rule: the business is the tenant. A new business gets its own full copy of the shared `__master__` catalog; master sync runs per business and never overwrites an item the business changed or deleted; taxonomy is read as master ∪ the business's own terms; owner and staff share that one copy. The global master (`businessId: '__master__'`) belongs to no business and only a platform admin changes it. Every scoped query goes through `server/utils/business-scope.js`.
- Source: ADR 0023 (plan 424; supersedes ADR 0008 D1)
- Touches: `server/routes/generic.js`, `server/utils/business-scope.js`, `server/services/**`, `server/migrations/**`, `server/jobs/**`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/master-push.service.ts`
- Users lose if broken: one kitchen's products or prices show up in another kitchen's lists, the owner and staff end up on different copies, or a master update overwrites a kitchen's own edit.
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
