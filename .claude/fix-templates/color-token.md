---
name: color-token
category: C — Theme & Styling Violations
applies-to: "*.scss"
auto-fix-paths: [A, B, C]
flag-only-paths: [ambiguous]
version: 4
created: 2026-04-12
last-tested: 2026-04-23T10:00:00Z
last-tested-version: 4
last-score: "6/6"
---
<!--
Version bump rule:
- Bump `version` whenever DECIDE tree, FIX paths, DETECT pattern,
  or SAFETY rules change.
- Do NOT bump for typo fixes, formatting, or example additions.
- When you bump, leave last-tested/last-tested-version/last-score
  stale — the next /test-template run will refresh them.
-->

# Fix Template: Hardcoded Hex Color → CSS Token

## PROBLEM
Hardcoded hex color used directly in component SCSS instead of a design system token.
Breaks theming, makes global color changes impossible.

## DETECT
Pattern: `#[0-9a-fA-F]{3,6}` in `*.scss` files
Exclude:
- Lines starting with `--` (these ARE token definitions)
- SVG data URIs (`url("data:image/svg+xml...`)
- Lines with a same-line comment containing "intentional" or "no token"

## SCOPE (run before DECIDE)
Count how many files contain this exact hex value (case-insensitive).
- 1 file → local token candidate
- 2+ files → must be a global token in styles.scss

## DECIDE

Follow these steps IN ORDER. Stop at the first match.

**Step 1: Check exclusions.**
- Does the line start with `--`? → SKIP (token definition). STOP.
- Is the hex inside an SVG data URI? → SKIP. STOP.
- Does a same-line comment say "intentional" or "no token"? → SKIP. STOP.

**Step 2: Check for #fff / #000 ambiguity.**
- Is the hex `#fff` or `#000`?
  - YES: Is there a colored background in the SAME rule block?
    (e.g. `background: var(--color-danger)`, `background: var(--color-primary)`, etc.)
    - YES → continue to Step 3 (treat as a normal hex on a colored surface).
    - NO → FLAG. STOP. Context too ambiguous.
  - NO: continue to Step 3.

**Step 3: Check existing tokens.**
- Does a token in styles.scss match this EXACT hex value?
  (Use the Context section to check — do not search the codebase.)
  - YES → A. Replace with the matching token. STOP.
  - NO → continue to Step 4.

**Step 4: Determine scope.**
- How many files contain this hex? (Use the Context section.)
  - 2+ files → B. Create a global token in styles.scss. STOP.
  - 1 file → continue to Step 5.

**Step 5a: Page-palette check.**
- Is this color part of a page or component's own visual identity —
  a color that belongs to THIS component's design, not the app's
  shared design system? Ask: "Would this token ever be imported by
  a different, unrelated component?"
  - NO, it's page-specific → C. Create a local `--cv-*` token. STOP.
  - YES, it belongs to the shared system → Step 5b.

**Step 5b: Global semantic name check.**
- Does the color have a clear, reusable semantic name recognized
  app-wide? (danger, favorite, warning, success, star-rating, allergen)
  - YES → B. Create a global token. STOP.
  - NO → C. Create a local `--cv-*` token in the component `:host` block. STOP.

## FIX

### PATH A — existing token, direct replacement
```
Before: color: #fff;
After:  color: var(--color-text-on-primary);
styles.scss: unchanged
```
Rule: only use `--color-text-on-primary` when the element has a colored background
in the same rule block (background: var(--color-danger), var(--color-primary), etc.)

### PATH B — new global token
```
Step 1: Add to styles.scss under the correct semantic group:
  --color-favorite: #e11d48;

Step 2: Replace in all affected files:
  color: #e11d48  →  color: var(--color-favorite)

Semantic groups in styles.scss (insert under the matching one):
  /* ---- Semantic: danger ---- */      → errors, destructive actions
  /* ---- Semantic: warning ---- */     → caution states
  /* ---- Semantic: favorite ---- */    → love/heart/save actions
  /* ---- Semantic: info / accent ---- */ → informational, decorative
```

### PATH C — local token in component :host
```
Step 1: Add to component :host block:
  :host {
    --cv-[name]: #hexvalue;
  }

Step 2: Replace in same file:
  color: #hexvalue  →  color: var(--cv-[name])
```

## EXAMPLES

### Example 1 — PATH B (new global token, 1 file but clear semantic name)
Situation: `.favorite-btn.is-favorited { color: #e11d48 }` — no token match, name is clear
```
styles.scss added:
  --color-favorite: #e11d48;

recipe-book-list.component.scss:
  Before: color: #e11d48;
  After:  color: var(--color-favorite);
```

### Example 2 — PATH A (existing token)
Situation: `.delete-btn:hover { background: var(--color-danger); color: #fff }`
```
ai-recipe-modal.component.scss:
  Before: color: #fff;
  After:  color: var(--color-text-on-primary);

styles.scss: unchanged
```

### Example 3 — FLAG (ambiguous #fff)
Situation: `.some-label { color: #fff }` — no background context
```
Decision: FLAG
Action: none — too ambiguous to determine correct token
```

### Example 4 — PATH C (local token, page-specific palette)
Situation: cook-view.page.scss uses many custom greens/teals unique to that page.
No global token match. No clear single semantic name. Page has its own visual identity.
```
:host block BEFORE (naked hex values):
  background: #f0f7f5;
  border: 1px solid #c8e6db;

:host block AFTER (local --cv-* tokens defined and used):
  :host {
    --cv-bg-page: #f0f7f5;
    --cv-border-soft: #c8e6db;
  }
  background: var(--cv-bg-page);
  border: 1px solid var(--cv-border-soft);

Rule for naming: --cv-[semantic-role] not --cv-[hex-description]
  ✅ --cv-bg-page   (role-based)
  ❌ --cv-f0f7f5    (hex-based — meaningless)
```

## SAFETY
- Never replace hex values that ARE token definitions (lines starting with --)
- Never replace #fff / #000 without a background context clue in the same rule block
- Never create duplicate tokens — search styles.scss for the hex before creating
- Never replace inside SVG data URIs
- Never create --color-favorite-2 — one token per semantic meaning
- If a file has > 20 hardcoded colors → FLAG the file, do not bulk auto-fix
