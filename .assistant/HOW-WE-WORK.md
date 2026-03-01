# How We Work

This file is the **entry point** for how agents (Cursor or other) should work on this project. When you iterate on foodVibe 1.0 — whether updating, creating, or refactoring — read this file and follow the linked skills for the work you are doing.

---

## Before you start

- **Plans**: When the user says "save the plan" (or equivalent), you **must** use the save-plan skill. See [Save plan](#save-plan) below.
- **Git**: When the user says "commit", "push", "save to GitHub", or similar, you **must** use the commit-to-github skill and get approval before any git writes. See [Commit to GitHub](#commit-to-github) below.
- **Styling**: When you create, update, or refactor any `.scss` or `.css` file in `src/`, you **must** follow the cssLayer skill first. See [CSS & Styling (cssLayer)](#css--styling-csslayer) below.

---

## Skills (read and follow when they apply)

### Save plan

- **Path**: [.assistant/skills/save-plan/SKILL.md](.assistant/skills/save-plan/SKILL.md)
- **When**: User asks to save the plan in any phrasing (e.g. "save the plan", "save plan and execute", "persist the plan"). Save **only** under the project `plans/` folder with the correct NNN or NNN-R naming.

### Commit to GitHub

- **Path**: [.assistant/skills/commit-to-github/SKILL.md](.assistant/skills/commit-to-github/SKILL.md)
- **When**: User asks to commit, push, save to GitHub, save to branches, or similar. Do **not** run `git add` / `git commit` / `git push` until the user has approved the visual plan from that skill.

### CSS & Styling (cssLayer)

- **Path**: [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md)
- **When**: Creating, updating, or refactoring any `.scss` or `.css` in the project (including component and page styles).
- **Workflow**: (1) Read `src/styles.scss` and reuse existing `:root` tokens. (2) Apply three-tier token placement (global / component-scoped / no token). (3) Use the Five-Group Vertical Rhythm in every selector. (4) Use logical properties and `var(--...)` / `rem` / `em` as specified in the skill.

### Angular component structure

- **Path**: [.assistant/skills/angularComponentStructure/SKILL.md](.assistant/skills/angularComponentStructure/SKILL.md)
- **When**: Creating or refactoring Angular components (class section order, CRDUL method grouping).

### Service layer (Angular data & state)

- **Path**: [.assistant/skills/serviceLayer/SKILL.md](.assistant/skills/serviceLayer/SKILL.md)
- **When**: Working with core services, Signals, or user feedback in Angular.

### Utility standards

- **Path**: [.assistant/skills/util-standards/SKILL.md](.assistant/skills/util-standards/SKILL.md)
- **When**: Adding or changing shared utility functions; purity and consistency rules for foodVibe 1.0.

### Tech debt

- **Path**: [.assistant/skills/techdebt/SKILL.md](.assistant/skills/techdebt/SKILL.md)
- **When**: End of session, before PRs; finding duplicated code, dead code, TODO audit.

### Update docs

- **Path**: [.assistant/skills/update-docs/SKILL.md](.assistant/skills/update-docs/SKILL.md)
- **When**: After completing features; refreshing breadcrumbs, agent docs, project docs.

### Elegant fix

- **Path**: [.assistant/skills/elegant-fix/SKILL.md](.assistant/skills/elegant-fix/SKILL.md)
- **When**: Refining a hacky solution into an elegant one after a fix that feels wrong.

### GitHub sync

- **Path**: [.assistant/skills/github-sync/SKILL.md](.assistant/skills/github-sync/SKILL.md)
- **When**: Start of session or after time away; pulling recent GitHub activity into context.

---

## Other references

- **Unified technical standards**: [.assistant/copilot-instructions.md](.assistant/copilot-instructions.md) — persona, gatekeeper protocol, and project-wide rules.
- **Agents**: [.assistant/agents/](.assistant/agents/) — team-leader, software-architect, product-manager, qa-engineer, breadcrumb-navigator for specialized tasks.

### Shared UI (before building new components)

Before adding a **new** dropdown, scrollable list overlay, or similar panel: (1) check **src/styles.scss** for existing **engines** (e.g. `.c-dropdown`, `.c-modal-card`, `.c-input-wrapper`) and use them instead of one-off classes; (2) check **src/app/shared/** for reusable components (e.g. `ScrollableDropdownComponent`) that already implement the pattern. Same for other repeated UI (modals, buttons, inputs): unify first via engines and shared components, then add component-specific modifiers or local styles only when needed.
