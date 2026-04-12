---
name: color-token
category: C — Theme & Styling Violations
applies-to: "*.scss"
auto-fix-paths: [A, B, C]
flag-only-paths: [ambiguous]
---

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
```
Does a token in styles.scss match this color AND its semantic meaning?
├─ YES
│   └─ PATH A — replace directly, no new token needed
│
├─ NO — hex used in 2+ files
│   └─ PATH B — create global token in styles.scss, replace in all files
│
├─ NO — hex used in 1 file only
│   ├─ Does the color have a clear semantic name? (danger, favorite, warning...)
│   │   ├─ YES → PATH B (global token — color will likely spread)
│   │   └─ NO  → PATH C (local --cv-* token in component :host block)
│   │
│   └─ Is the hex #fff or #000 with NO colored background in the same rule?
│       └─ YES → FLAG — context too ambiguous, do not auto-fix
│
└─ Comment on same line says "intentional" or "no token"
    └─ SKIP — do not touch
```

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

## SAFETY
- Never replace hex values that ARE token definitions (lines starting with --)
- Never replace #fff / #000 without a background context clue in the same rule block
- Never create duplicate tokens — search styles.scss for the hex before creating
- Never replace inside SVG data URIs
- Never create --color-favorite-2 — one token per semantic meaning
- If a file has > 20 hardcoded colors → FLAG the file, do not bulk auto-fix
