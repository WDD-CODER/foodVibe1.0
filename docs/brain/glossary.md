# Glossary

- **Canonical value/key** — the English identifier stored for a unit, category, allergen, section category, or preparation category, resolved from Hebrew user input so the same concept is never stored twice.
- **`translatePipe` / `dictionary.json`** — the mandatory path for every user-facing string; Hebrew is never hardcoded in templates. Dictionary sections: `units`, `categories`, `allergens`, `general`.
- **Translation-key modal** — the existing shared modal (`src/app/shared/`) used when a Hebrew input has no matching canonical key yet and the user must supply the English key.
- **`entityType`** — the `SCREAMING_SNAKE_CASE`, domain-prefixed key (`KITCHEN_*`, `MENU_*`, `TRASH_*`) identifying a persisted collection; see the registry in `docs/agent/standards-backend.md` §1.
- **Tombstone / soft-delete** — deleting an entity moves it to its `TRASH_*` counterpart instead of destroying it. See [[tombstone-soft-delete]].
- **Ingredient ledger** — the recipe/dish → product quantity tracking that Hebrew canonical resolution and unit registries feed into.
- **Lucide icon registration** — every `<lucide-icon>` used in a template must be imported (PascalCase) and added to `LucideAngularModule.pick({...})` in `app.config.ts`, or it throws at runtime.
