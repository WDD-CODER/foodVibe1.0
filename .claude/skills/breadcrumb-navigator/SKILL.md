# Skill: Breadcrumb Navigator — foodVibe 1.0

Create and maintain `breadcrumbs.md` files that serve as navigation guides for agents and developers.

## When to Run

- After completing significant development (new components, services, pages, or directories)
- Before working in an unfamiliar directory (read existing breadcrumbs first)
- As part of the `update-docs` skill Phase 2
- After any structural refactor that moves or renames files
- When adding a **new** `pages/<feature>/` or top-level subtree under `src/app/` — add or refresh `breadcrumbs.md` at the hub (not every leaf folder; see **breadcrumbs.md** in `.claude/copilot-instructions.md` section 4)

## MANDATORY: Read before write

Before updating or creating a `breadcrumbs.md`, read the existing one (if it exists) to preserve intent and avoid overwriting accurate sections.

---

## Workflow

### Phase 1 — Scan

1. Check for an existing `breadcrumbs.md` in the target directory. If found, read it.
2. List all files and immediate subdirectories in the target directory.
3. For each file: read it briefly to understand its purpose, exports, and relationships.
4. Identify the directory priority order (process in this sequence):
   - `src/app/core/services/` — most critical, used everywhere
   - `src/app/core/models/` — data structures
   - `src/app/pages/` — each page and its `components/`
   - `src/app/shared/` — reusable UI components
   - `src/app/core/` — guards, pipes, directives
   - Root config files

### Phase 2 — Analyze

For each file in scope, determine:
- **Purpose**: what does this file do in one sentence?
- **Key exports**: what symbols does it export that other files use?
- **Relationships**: what does it depend on, and what depends on it?
- **Patterns**: any local conventions (signal naming, component patterns)?
- **Gotchas**: anything a developer should know before modifying this file?

Skip: `node_modules/`, `.angular/`, `dist/`, `.git/`

### Phase 3 — Write

Write or update the `breadcrumbs.md` using this template:

```markdown
# [Directory Name] — Breadcrumbs

## Purpose
[1-2 sentences: what this directory does in the project]

## Navigation
| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| filename.ts | Brief purpose | ExportedSymbol |
| subdirectory/ | Brief purpose | → see subdirectory/breadcrumbs.md |

## Architecture Context
[How this directory fits into core/ → shared/ → pages/ hierarchy]

## Patterns & Conventions
- [Signal naming: data_ = signal(), public via .asReadonly()]
- [Component patterns: standalone, inject()]
- [Any local conventions specific to this directory]

## Dependencies
- **Imports from**: [key internal dependencies]
- **Used by**: [what depends on this directory]

## Development Notes
[Gotchas, active TODOs, things to watch out for when modifying files here]

---
*Last updated: [YYYY-MM-DD]*
*Updated by: breadcrumb-navigator*
```

**Content rules:**
- Every file listed must exist — verify before writing
- Every description must be verifiable from the code
- Be precise and actionable; no generic filler
- A developer unfamiliar with the codebase should understand the directory's purpose within 30 seconds

### Phase 4 — Verify

1. Read back the file you just wrote.
2. Confirm every file path in the Navigation table resolves to a real file.
3. Confirm no section references a symbol or pattern that no longer exists in the code.
4. Report: directories updated, files listed, any gaps that need follow-up.

---

## Output

```
== BREADCRUMBS UPDATE COMPLETE ==

Directories updated:
  - [x] src/app/core/services/ — [N] files documented
  - [x] src/app/pages/recipe-builder/ — [N] files documented

Skipped (no changes needed):
  - src/app/shared/ — breadcrumbs.md is current

Follow-up needed:
  - [Any files whose purpose could not be determined from code alone]
```

## Related

- `update-docs` skill — Phase 2 invokes this skill
- `agent.md` — Preflight Checklist step 3: read breadcrumbs before changing a directory
