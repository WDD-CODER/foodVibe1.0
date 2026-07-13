> RETIRED — MemPalace/claude-mem/reflect automation retired in July 2026 cutover. Do not execute. Prefer docs/brain/.

# Nightly Code Audit System — Implementation Plan

**Date:** 2026-04-10
**Branch:** feat/nightly-audit
**Status:** Phase 1 — Planning

---

## Context & Findings

### Existing infrastructure
- **Skills:** 23 existing skills in `.claude/skills/` — each in its own directory with `SKILL.md`
- **Commands:** 19 existing commands in `.claude/commands/` — flat `.md` files
- **Reports:** No `.claude/reports/` directory exists yet — will create `audit/` and `audit/archive/`
- **Techdebt system:** `.claude/techdebt-reports/` with rolling 7-report retention — our audit system mirrors this pattern with 30-day retention

### Translation system (Category A context)
- `TranslationService` in `src/app/core/services/translation.service.ts`
- Loads from `/assets/data/dictionary.json` (not found on disk — likely built or fetched at runtime)
- Dictionary structure: `{ units, categories, section_categories, allergens, actions, preparation_categories, export_headers, general }` — each is `Record<string, string>` (key → Hebrew label)
- Translation lookup: `translate(key)` returns Hebrew string from `masterDict` signal
- Components use `TranslationService.translate()` for i18n — hardcoded Hebrew should use this instead
- **Auto-fix approach:** Flag-only for Category A. The correct translation key may not exist yet, and the agent cannot safely create dictionary entries without human confirmation

### Shared components (Category B context)
- 31 shared components in `src/app/shared/` including: confirm-modal, loader, counter, custom-select, custom-multi-select, chip-search-dropdown, list-shell, carousel-header, selection-bar, approve-stamp, etc.
- No barrel file (`index.ts`) — components imported directly
- Detection: compare new component structure/purpose against this known list

### CSS theme system (Category C context)
- Global tokens in `src/styles.scss` `:root` block — Liquid Glass design system
- Token categories: surfaces (`--bg-*`), borders (`--border-*`), text (`--color-text-*`), primary (`--color-primary*`), semantic (success/warning/danger), radii (`--radius-*`), shadows (`--shadow-*`), blur (`--blur-*`), animation easing
- Engine classes: `.c-glass-card`, `.c-glass-panel`, `.c-btn-primary`, `.c-btn-ghost`, `.c-input`, `.c-modal-*`, `.c-dropdown`, `.c-chip`, `.c-table-wrap`
- SCSS breakpoint vars: `$break-mobile: 768px`, `$break-tablet: 900px`, `$break-desktop: 1200px`
- ~65 SCSS files across the project

### Security observations (Category D — already found)
- `.env` file contains real secrets (MongoDB URI, Gemini API key, JWT secret) — should be in `.gitignore`
- Need to scan for `[innerHTML]`, `localStorage` token storage, console.log data leaks

### Environment
- No nodemailer in `package.json` — will need to install for email notifications
- Node.js/Express backend at `server/`

---

## Artifacts to Create

### 1. `.claude/skills/nightly-audit/SKILL.md`
The core audit logic. Contains:
- Five scan category definitions with exact regex patterns
- Detection rules for each category
- Auto-fix rules with safety limits
- Report format specification
- Git safety protocol (9-step flow)
- Email notification logic
- 30-day retention policy

### 2. `.claude/commands/nightly-audit.md`
The slash command entry point. When invoked:
1. Loads the nightly-audit skill
2. Executes the full scan pipeline across all 5 categories
3. Follows the git safety protocol (branch, plan commit, fix commit, merge, report)
4. Sends email notification (or logs to terminal if unconfigured)
5. Outputs terminal summary

### 3. `.claude/reports/audit/TEMPLATE.md`
The canonical report template the agent fills on each run.

### 4. `scripts/audit-notify.ts`
Standalone Node.js script for email notification using nodemailer.
- Reads the report file, extracts summary counts
- Sends formatted email via Gmail SMTP
- Graceful failure if env vars not configured

### 5. `.env` additions
Placeholder entries for `AUDIT_NOTIFY_EMAIL_FROM`, `AUDIT_NOTIFY_EMAIL_TO`, `AUDIT_NOTIFY_EMAIL_PASSWORD`

---

## Execution Order

| Step | Artifact | Dependencies |
|------|----------|-------------|
| 1 | Create `.claude/reports/audit/` and `archive/` dirs | None |
| 2 | Write `TEMPLATE.md` | None |
| 3 | Write `SKILL.md` | Template must exist for reference |
| 4 | Write `nightly-audit.md` command | Skill must exist |
| 5 | Write `scripts/audit-notify.ts` | None |
| 6 | Add env placeholders to `.env` | None |
| 7 | Install `nodemailer` + `@types/nodemailer` | None |
| 8 | Dry-run the command on current codebase | All above |
| 9 | Review dry-run output, fix any issues | Step 8 |
| 10 | Final commit | All validated |

---

## Design Decisions

1. **Category A (Hebrew) → FLAG-only, not auto-fix.** The brief says auto-fix, but creating translation keys requires knowing the correct canonical key and updating the dictionary. This is too risky for unattended execution. Changed to flag-only.

2. **Email script is standalone TypeScript**, not embedded in the skill. This keeps the skill file pure markdown (consistent with all other skills) and the notification logic testable independently.

3. **30-day retention** with auto-archive mirrors the techdebt 7-day pattern but with a longer window since nightly audits generate historical trend data.

4. **GitHub Actions workflow deferred** per brief instructions — not implemented this session.

5. **Auto-fix scope is conservative**: only Category C (clear 1-to-1 CSS token swaps) and Category E (unused imports, console.logs) get auto-fixed. Everything else is flagged.

---

## Category Detection Patterns

### A — Hebrew strings
```regex
[\u0590-\u05FF]
```
Scan: `*.html`, `*.component.ts` (excluding `dictionary.json`, `translation.service.ts`, test files)

### B — Shared component duplication
Manual semantic analysis — compare new component templates against the 31 known shared components for structural similarity.

### C — Styling violations
- Hardcoded colors: `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(` in `.scss` (excluding `styles.scss` token definitions)
- Inline styles: `style="` in `.html` templates
- Font overrides: `font-size:`, `font-family:` in component `.scss`
- Engine class misuse: `.c-` classes referenced inside component SCSS `@extend` or direct use

### D — Security
- `[innerHTML]` without sanitization
- `localStorage.setItem` with token/auth/jwt/session patterns
- `console.log` printing request/user/token data
- Hardcoded strings matching API key / secret / password patterns
- `http://` (non-https) in API calls

### E — Dead code
- Unused imports (TypeScript compiler can detect)
- Commented-out blocks > 5 lines
- `console.log` in non-error-handling code paths
- Empty catch blocks `catch {}` or `catch (e) {}`
