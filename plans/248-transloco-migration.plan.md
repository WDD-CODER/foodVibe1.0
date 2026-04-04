# Plan 248 — Transloco Migration

**Status:** Planned
**Source design:** `~/.gstack/projects/WDD-CODER-foodVibe1.0/danwe-main-design-20260404-144233.md` (APPROVED, 9/10)
**Risk:** Medium — 707 template locations, per-component scope wiring (not pure search/replace)
**Effort (CC):** ~2-3 hours | **Human QA:** ~2 hours

---

## Context

Phase 1 (bug fixes) is already complete as of 2026-04-04:
- `sortedFinalDict` now correctly used in `masterDict.set()`
- Hebrew keys removed from `dictionary.json`; `cutting` and `frying` added as proper English keys
- `TranslatePipe` marked with TODO comment pointing to this plan

This plan covers Phase 2: replacing the custom `TranslationService` display machinery with
[Transloco](https://jsverse.github.io/transloco/) and slimming `TranslationService` down to
a `VocabularyService` (~40 lines) for reverse resolution only.

---

## What Changes

```
BEFORE                          AFTER
──────────────────────────      ──────────────────────────────
TranslationService              TranslocoService (library)
  └─ loadGlobalDictionary()       └─ loads /assets/i18n/he/*.json
  └─ translate(key)               └─ translate('scope.key')
  └─ masterDict signal            └─ handles caching internally

TranslatePipe (pure: false)     Transloco pipe (pure: true, built-in)
  {{ 'cup' | translatePipe }}     {{ 'units.cup' | transloco }}

dictionary.json (one flat file)  assets/i18n/he/ (8 scoped files)
```

**Not replaced:**
- `KeyResolutionService` — context-aware Hebrew input → English key (stays)
- `VocabularyService` (new name for slimmed `TranslationService`) — reverse map + user additions

---

## Service Boundary

- **`KeyResolutionService`** — authoritative context-aware layer. Calls `VocabularyService.resolve()`.
- **`VocabularyService`** — context-free. Just the reverse map and user addition handling.

---

## Atomic Sub-tasks

- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/` (units, categories, section-categories, allergens, preparation-categories, actions, export-headers, general)
- [ ] Verify Transloco loader path resolves correctly — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed keys, e.g. `'units.cup'`); add `TranslocoModule` or `TranslocoDirective` to each component's `imports` array
- [ ] Replace `this.translation.translate(...)` service calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` — slim reverse-map service (~40 lines: `resolve()`, `addEntry()`, localStorage user additions)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService` instead of `TranslationService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `src/app/core/pipes/translation-pipe.pipe.ts` and `src/app/core/services/translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the running app

---

## Rollback Strategy

Keep `TranslatePipe` as a deprecated passthrough alias during migration (it continues using
the old `TranslationService`, which stays intact). Migrate components in batches. Delete
`TranslatePipe` and `TranslationService` only after all 707 usages are confirmed migrated.

---

## Template Migration Patterns

Three patterns — not all are pure search/replace:

**Pattern A — inline key (most components):**
```html
{{ 'cup' | translatePipe }}  →  {{ 'units.cup' | transloco }}
```

**Pattern B — scoped structural directive (components with many keys from one scope):**
```html
<ng-container *transloco="let t; scope: 'units'">
  {{ t('cup') }}
</ng-container>
```

**Pattern C — TypeScript service calls:**
```typescript
this.translation.translate('cup')  →  this.transloco.translate('units.cup')
```

---

## Success Criteria

- `TranslatePipe` deleted from codebase
- `TranslationService` renamed to `VocabularyService`; `translation.service.ts` removed
- `KeyResolutionService` injects `VocabularyService`
- `{{ 'cup' | transloco }}` renders `כוס` in the running app
- `ng build` passes with no errors

---

## Open Questions

1. Are chef-added vocabulary terms (currently in `localStorage`) meant to survive browser
   cache clears? If yes, a `/api/vocabulary` endpoint should be added to this plan's scope.
