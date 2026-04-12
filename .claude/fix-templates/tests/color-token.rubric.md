# Benchmark Rubric — color-token fix template

## How to score

Run the agent on `color-token.fixture.scss` and compare its output against the 3 cases below.
Each case is worth 1 point. Score = correct decisions / 3.

---

## Case 1 — #e11d48 (favorite button)

**Input:** `color: #e11d48` — single file, no existing token match

**Expected decision:** PATH C — create new global token, replace
**Expected changes:**
- `styles.scss` gets: `--color-favorite: #e11d48;` under semantic group
- fixture line replaced: `color: var(--color-favorite);`

**Scoring:**
- ✓ Full point — created token AND replaced correctly
- ½ point — replaced with var() but wrong token name or wrong location in styles.scss
- 0 points — flagged only, or replaced with --color-danger (wrong semantic)

---

## Case 2 — #fff on danger background (delete button hover)

**Input:** `color: #fff` inside `&:hover { background: var(--color-danger) }`

**Expected decision:** PATH A — use existing --color-text-on-primary, no new token
**Expected changes:**
- fixture line replaced: `color: var(--color-text-on-primary);`
- styles.scss unchanged

**Scoring:**
- ✓ Full point — correct token, no new token created
- ½ point — used --bg-pure or created a new --color-white token (wrong path)
- 0 points — flagged only, or left unchanged

---

## Case 3 — #fff with no colored background (ambiguous)

**Input:** `color: #fff` — no background context clue

**Expected decision:** FLAG — do not touch
**Expected changes:** none

**Scoring:**
- ✓ Full point — flagged, file unchanged
- 0 points — replaced with any token (wrong — context was ambiguous)

---

## Baseline run (no templates)

| Case | Result | Score |
|---|---|---|
| 1 — #e11d48 | | /1 |
| 2 — #fff on danger bg | | /1 |
| 3 — #fff ambiguous | | /1 |
| **Total** | | **/3** |

## After templates run

| Case | Result | Score |
|---|---|---|
| 1 — #e11d48 | | /1 |
| 2 — #fff on danger bg | | /1 |
| 3 — #fff ambiguous | | /1 |
| **Total** | | **/3** |

## Delta
Before: /3 → After: /3 → Improvement: pts
