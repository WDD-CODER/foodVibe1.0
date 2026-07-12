# /fix â€” Bug Fix Path

Use this path for fixing bugs, errors, and broken behavior.

## Usage

```
/fix                    â€” general bug fix (prompts for area)
/fix css                â€” CSS layout or styling bug
/fix auth               â€” authentication or authorization bug
/fix data               â€” data service, MongoDB, or API data bug
/fix ui                 â€” UI component or interaction bug
/fix api                â€” backend route, server, or integration bug
/fix other              â€” anything that doesn't fit the above
```

## Loads by area

| Area | Standards loaded |
|------|-----------------|
| `css` | `docs/agent/standards-angular.md` (CSS section) + `cssLayer` skill |
| `auth` | `docs/agent/standards-security.md` + `auth-and-logging` + `auth-crypto` |
| `data` | `docs/agent/standards-domain.md` + `docs/agent/standards-backend.md` |
| `ui` | `docs/agent/standards-angular.md` (Components) + `docs/agent/standards-domain.md` |
| `api` | `docs/agent/standards-backend.md` + `docs/agent/standards-security.md` |
| `other` | `docs/agent/` (path-scoped) + `CLAUDE.md` |

## Invokes

- `investigate` â€” root cause analysis before any fix is applied
- `elegant-fix` â€” after a working fix exists, refine it to production quality

## Typical flow

1. User describes the bug (area + symptom).
2. `investigate` traces the root cause (checks recent changes, failure history, source).
3. Fix is implemented atomically â€” one targeted change.
4. `elegant-fix` reviews the fix for code quality, edge cases, and consistency.
5. `ng build` / `ng lint` pass. Human commits via `git-agent` prep.

## Hard rules

- NEVER fix a symptom without identifying the root cause first.
- `ng build` must pass before committing.
- No semicolons in any `.ts` file touched during the fix.
- 3-strike rule: at most 3 autonomous fix attempts in scoped files; then STOP and report.
