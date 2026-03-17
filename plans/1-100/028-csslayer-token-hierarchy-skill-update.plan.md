# cssLayer skill update: global tokens file and three-tier token logic

## Current state (what the skill says today)

- **.assistant/skills/cssLayer/SKILL.md** §2 "Unification Rule" says: *"Tokens: Zero tolerance for hex codes or raw px. Use var(--token)."* It does **not** define:
  - A single designated file for app-wide CSS variables.
  - When to put a token in a global file vs in the component vs not at all.
  - A step to read that file before creating/editing styles.

- **Project:** `src/styles.scss` is the global stylesheet (referenced in `angular.json`). It has a `:root` block with only `font-family`. There is no other central place for design tokens yet.

---

## Target behavior (what you want)

1. **One designated file** for app-wide root variables (e.g. `--ml-bg`, `--accent`, border/background colors reused in many places). Use it for unified, professional styling across the app.
2. **Before writing component styles**, the agent must **read that file** to see existing tokens and reuse them where they fit.
3. **Three-tier decision for every tokenizable value**:
   - **Global (designated file)**: Value is (or will be) reused **across multiple components/pages** → define in the designated file under `:root`, use `var(--name)` everywhere.
   - **Component-scoped (`:host`)**: Value is reused **only inside that component** (e.g. several times in the same file) but not app-wide → define in that component's `:host { --local: value; }`, use `var(--local)` only in that file.
   - **No token**: Value is used **once or twice** in that component → use the value directly in the rule; do not create a token.
4. **When a suitable token is missing**: If the agent sees a value that recurs across the app (or clearly belongs to the design system), **add** it to the designated file and use `var(--...)` in the new/edited component.

---

## Designated file choice

- **Recommendation:** Use **`src/styles.scss`** and extend its `:root` block for design tokens. No new file; one source of truth already loaded everywhere.

---

## Exact changes to the skill

### 1. New subsection: "Designated global tokens file" (after §1 or inside §2)

- **Add** a short bullet block that names the path (`src/styles.scss`), states root variables live in `:root { ... }`, and that they are for properties reused across the application.

### 2. Replace / extend §2 token bullet with "Token placement (three tiers)"

- **Change to:** Rule bodies use `var(--token)` and `rem`/`em` when a token is used; exception for "No token" tier (1–2 uses) where value may be literal. Three tiers: Global (designated file) / Component-scoped (`:host`) / No token. When adding to global: add to designated file's `:root` and use `var(--...)` in components.

### 3. Add "Before styling" workflow step

- **Add:** (1) Read the designated global tokens file. (2) Reuse existing `:root` variables where they apply. (3) For any new value, decide tier and create/reference tokens accordingly.

### 4. Token naming convention

- **Add:** Global: e.g. `--color-*`, `--bg-*`, `--radius-*`, `--shadow-*`. Component-scoped: prefix/suffix (e.g. `--ml-bg`).

### 5. Update §4 Per-Selector Checklist

- **Add:** "Did I check the designated tokens file and apply the three-tier rule (global / component-scoped / no token)?"

### 6. Clarify where hex/px are allowed

- **State:** Hex and `px` allowed only in: (a) designated global file `:root { --name: value; }`, (b) component `:host { --local: value; }`, (c) rule bodies when "No token" applies (1–2 uses).

---

## What we are not changing

- Five-group vertical rhythm (§3); Engine/unification rule for `.c-*`; Nesting, encapsulation, no inline styles, Tailwind override; Master pattern example (§5).
