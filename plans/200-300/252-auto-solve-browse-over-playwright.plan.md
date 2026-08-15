---
name: auto-solve browse over playwright
overview: Update auto-solve command to prefer gstack /browse ($B) for visual QA over Playwright MCP, keeping Playwright as explicit fallback.
isProject: false
todos:
  - "[x] frontmatter allowed-tools — add Skill"
  - "[x] Phase 2 line 81 — $B primary visual verify"
  - "[x] Phase 4 line 133 — $B screenshot primary"
  - "[x] Error Handling — update Playwright unavailable text"
  - "[x] Permissions Required — add Skill note"
---

# Goal

Update `auto-solve.md` to prefer gstack `/browse` (via `$B` command vocabulary) for visual
QA over Playwright MCP. Playwright MCP remains the explicit fallback. The UI Inspector was
already deleted in Plan 198 — this plan fixes the remaining Playwright-first references in
the auto-solve command which is the active executor of plans.

# Atomic Sub-tasks

- [ ] `auto-solve.md` frontmatter — add `Skill` to allowed-tools list so `/browse` can be invoked
- [ ] `auto-solve.md` Phase 2 line 81 — replace Playwright-first browser verification with gstack /browse ($B) as primary, Playwright MCP as fallback
- [ ] `auto-solve.md` Phase 4 line 133 — replace "if Playwright available" screenshot with `$B screenshot` primary, Playwright MCP fallback
- [ ] `auto-solve.md` Error Handling line 199 — update "Playwright unavailable" to reflect gstack /browse as primary tool
- [ ] `auto-solve.md` Permissions Required line 210 — add Skill invocation note alongside Playwright MCP entry

# Rules

- Do not remove Playwright MCP — it is the documented fallback
- Do not touch other agents or mcp.json
- Keep existing logic intact; only update tool-selection instructions and fallback language
- $B vocabulary: `$B goto`, `$B snapshot`, `$B screenshot`, `$B js`

# Done when

- `auto-solve.md` Phase 2 instructs gstack /browse ($B) first, Playwright MCP second
- `auto-solve.md` Phase 4 captures screenshot via `$B screenshot`, Playwright as fallback
- Error handling text reflects gstack /browse as primary (not Playwright)
- A grep for `playwright` in `auto-solve.md` returns only fallback-labeled lines
