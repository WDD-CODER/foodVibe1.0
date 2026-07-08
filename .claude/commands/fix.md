# /fix — Bug Fix Path

Use this path for fixing bugs, errors, and broken behavior.

## Usage

```
/fix                    — general bug fix (prompts for area)
/fix css                — CSS layout or styling bug
/fix auth               — authentication or authorization bug
/fix data               — data service, MongoDB, or API data bug
/fix ui                 — UI component or interaction bug
/fix api                — backend route, server, or integration bug
/fix other              — anything that doesn't fit the above
```

## Loads by area

| Area | Standards loaded |
|------|-----------------|
| `css` | `.claude/rules/angular.md` (CSS section) + `cssLayer` skill |
| `auth` | `.claude/rules/security.md` + `auth-and-logging` + `auth-crypto` |
| `data` | `.claude/rules/domain.md` + `.claude/rules/backend.md` |
| `ui` | `.claude/rules/angular.md` (Components) + `.claude/rules/domain.md` |
| `api` | `.claude/rules/backend.md` + `.claude/rules/security.md` |
| `other` | `.claude/rules/` (path-scoped) + `CLAUDE.md` |

## Invokes

- `investigate` — root cause analysis before any fix is applied
- `elegant-fix` — after a working fix exists, refine it to production quality

## Typical flow

1. User describes the bug (area + symptom).
2. `investigate` traces the root cause (checks recent changes, failure history, source).
3. Fix is implemented atomically — one targeted change.
4. `elegant-fix` reviews the fix for code quality, edge cases, and consistency.
5. `ng build` / `ng lint` pass. Human commits via `git-agent` prep.

## Hard rules

- NEVER fix a symptom without identifying the root cause first.
- `ng build` must pass before committing.
- No semicolons in any `.ts` file touched during the fix.
- 3-strike rule: at most 3 autonomous fix attempts in scoped files; then STOP and report.
