# Mobile Audit — Login Flow

## Metadata

| Field | Value |
|---|---|
| Run date | 2026-04-20 |
| Viewport | 375×812 (RTL — Hebrew, `dir="rtl"`) |
| Route | `/dashboard` → auth modal (login tab) |
| Probe | P5 (keyboard-open / field focus states) |
| Credentials used | username: `mobileaudit`, password: `Audit2026!` |
| Severity counts | Critical: 0 · Major: 2 · Minor: 2 |
| Screenshots | 8 |

---

## Defects

### DEF-L01 — Eye icon (password toggle) anchored to physical left in RTL layout

**Severity:** Major  
**Screenshot:** `shots/03-password-focused.png`, `shots/04-form-filled.png`  
**Selector:** `button.password-toggle`

**Description:**
The password visibility toggle icon is positioned at `left: 8px` (physical left edge) instead of the logical inline-start edge. In RTL mode, the reading/entry direction starts from the right, so the toggle should appear at the right edge of the password input. The computed value `left: 8px` overrides RTL directionality and places the button on the wrong side.

**Observed values:**
- `left: 8px` (CSS property)
- `right: 223px`
- `inset-inline-start: 223px` (computed — confirms RTL logical start is right edge, but physical `left` wins)

**Repro steps:**
1. Open app at 375×812.
2. Tap "התחברות" to open auth modal.
3. Observe the eye icon in the password field — it appears on the LEFT side.
4. In RTL context, it should appear on the RIGHT edge.

**Note:** Same defect as signup flow finding (same selector, same root cause).

---

### DEF-L02 — Background navigation not aria-hidden when auth modal is open

**Severity:** Major  
**Screenshot:** `shots/01-baseline.png`, `shots/07-modal-overlay-check.png`  
**Selector:** `nav[aria-label="main navigation"]`, `.header-nav`

**Description:**
When the auth modal is open, background navigation elements remain in the accessibility tree with no `aria-hidden` attribute. Screen readers and keyboard users can tab into background nav links (`לוח בקרה`, `מלאי`, `ספר מתכונים`, `תפריטי אירוע`) while the modal is open, breaking focus containment.

**Observed values:**
- `nav[aria-label="main navigation"]`: `ariaHidden = null`, `visibility: visible`
- Overlay correctly blocks pointer events (mouse/touch are blocked at all y coordinates including y=780, y=790)
- Accessibility tree is NOT blocked — keyboard/AT users reach background elements

**Repro steps:**
1. Open app at 375×812.
2. Tap "התחברות" to open auth modal.
3. Use Tab key or screen reader — background nav links are reachable.

---

### DEF-L03 — FAB overlaps bottom navigation bar post-login (pre-existing)

**Severity:** Minor  
**Screenshot:** `shots/05-post-login.png`, `shots/06-scroll-bottom.png`  
**Selector:** `button.fab-action[aria-label="בונה מתכונים"]`

**Description:**
After login, the FAB (flame icon, "בונה מתכונים") renders over the bottom navigation bar on the left side, partially clipping the bottom-left dashboard card's button text.

**Note:** Pre-existing defect from prior audit (2026-04-09). Confirmed still present.

---

### DEF-L04 — Login field has undisclosed 20-character max; email credentials rejected on submit

**Severity:** Minor  
**Screenshot:** `shots/05-post-login-attempt.png`  
**Selector:** `input[aria-label="שם משתמש"]`

**Description:**
The login field is labeled "שם משתמש" (username) with a 20-character limit that is only revealed on submit — not shown inline. Entering an email-format credential (e.g. `mobileaudit@foodvibe.test`, 25 chars) triggers the error "שם משתמש עד 20 תווים" with no prior warning. The character constraint should be surfaced as inline hint text below the input, not as a post-submit error.

**Repro steps:**
1. Open auth modal at 375×812.
2. Type `mobileaudit@foodvibe.test` into שם משתמש field, fill password, tap "התחברות".
3. Observe error "שם משתמש עד 20 תווים" — login blocked with no prior hint.

---

## Known Defects Referenced (Not Duplicated)

- **auth-modal overlay background interactive (critical, 2026-04-09)**: NOT reproduced. Overlay confirmed `position: fixed; 375×812; z-index: 1000; pointer-events: auto`. `elementFromPoint` returns `.c-modal-overlay` at y=780 and y=790. This critical issue appears fixed.
- **Eye icon wrong edge (signup audit)**: Same root cause as DEF-L01 above. Logged here with login-specific repro.
- **FAB overlaps bottom nav (prior audit)**: Confirmed present — see DEF-L03 above.

---

## P5 Probe Findings (Keyboard-Open State)

Applied in headless mode (virtual keyboard not available — static focus-state observations only):

- **Email field focused** (`shots/02-email-focused.png`): Focus ring correct. No layout shift. Modal static.
- **Password field focused** (`shots/03-password-focused.png`): Focus ring correct. Eye icon defect most visible here (DEF-L01).
- No scroll-into-view failures in headless mode.

> Real-device verification recommended: software keyboard push can hide the submit button below the keyboard fold. Not observable in headless.
