# Changelog

All notable changes to FoodVibe are documented here.

## [0.0.1.0] - 2026-04-24

### Added
- AI recipe modal now surfaces quality warnings inline before opening the recipe builder — users see soft validation notices (low ingredient count, high yield, few steps, bad yield unit) and can continue or go back
- Token-based context monitor Python hook with 3-tier warnings (40%/60%/73%) and `/context-override` command
- Render Flow Auditor agent and `/render-flow-audit` command for automated live-site QA
- Post-compact resume reminders in pre-compact and session-startup hooks; pre-compact hook now reads SESSION SAVE TARGET dynamically
- `model-context-windows.json` config for context window scaling per model
- GitHub Actions keepalive workflow for Render deployment

### Fixed
- Recipe builder edit route redirect (was navigating to wrong route)
- Auth modal spinner — no longer flashes on already-authenticated users
- Gemini DB pool keepalive workflow to prevent cold-start timeouts

### Removed
- Orphaned `gemini-shots.util.ts` no-op stub (Plan 259 DB approach is live — no client-side localStorage shots)
- Baseline recording block from `pre-compact-reminder.sh` (context-monitor.py handles this)

### Changed
- todo.md reorganised into labelled sections (Operational / In Progress / Large Refactors / Infrastructure / Roadmap / Deferred / Mobile Audits)
- Plans 072, 089, 247, 134, 074, 167, 259, 284 archived after verification
