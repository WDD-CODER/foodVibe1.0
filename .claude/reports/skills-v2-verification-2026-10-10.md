# Skills v2 — verification report (2026-10-10)

Branch `chore/skill-authoring-standard` @ `110afab7`, verified in slot `wt-2` (dev server :4202, MongoDB :27017 both up).
Report only — nothing was fixed. All scratch edits were reverted; see "Cleanup" at the end.

**Totals:** 20 DONE · 5 BROKEN · 1 NOT DONE · 3 NOT VERIFIED

All re-run commands are **PowerShell 5**, one per line, run from the repo root
(`cd "C:\coding projects\Cursor\foodVibe1.0-wt-2"`). After any `node …` line, run `$LASTEXITCODE` to see the exit code.

## Results

| # | Check | Result | Evidence | Re-run it yourself |
| --- | --- | --- | --- | --- |
| 1 | Branch has 2 commits on main | DONE | `761e9914 docs(agent): add skill-authoring standard…`, `110afab7 chore(skills): rewrite… 14 → 10`; merge-base `f739e9a1` | `git log --oneline origin/main..HEAD` (note: in a slot, local `main` is stale; `git diff main..HEAD` shows unrelated todo/plan noise, use `f739e9a..HEAD`) |
| 2a | Exactly 10 skills | DONE | `.claude/skills/` = angularComponentStructure, auth-and-logging, breadcrumbs, brief-detection, cssLayer, github-sync, preflight, save-plan, techdebt, worktree-setup | `Get-ChildItem .claude\skills -Directory \| Select Name` |
| 2b | 5 retired dirs gone | DONE | all five `Test-Path` false | `"angular-pipe-logic","auth-crypto","elegant-fix","update-docs","breadcrumb-navigator" \| % { "$_ " + (Test-Path ".claude\skills\$_") }` |
| 2c | No references to retired skills | **BROKEN** | `.claude/commands/security.md:9`: ``- `auth-crypto` skill — hashing, encryption, token handling, secrets management``. All other `auth-crypto` hits refer to the file `auth-crypto.ts` (fine). | `Select-String -Path AGENTS.md,.claude\commands\*.md,docs\agent\*.md,.cursor\rules\*.mdc -Pattern 'angular-pipe-logic','elegant-fix','update-docs','breadcrumb-navigator','`auth-crypto` skill'` |
| | | | **Fix (one line):** replace that line with ``- `auth-and-logging` skill — auth, logging, and the `auth-crypto.ts` hashing/token rules`` | |
| 3a | `claude plugin validate` | DONE | Claude Code 2.1.287 → `✔ Validation passed`, exit 0 | `claude plugin validate .claude/skills` |
| 3b | No BOM in front of `---` | DONE | first 3 bytes of all 10 SKILL.md = `2d 2d 2d`. No mojibake (`â€`) in skills or commands. | `Get-ChildItem .claude\skills\*\SKILL.md \| % { $_.Directory.Name + ' ' + ((Get-Content $_.FullName -Encoding Byte -TotalCount 3) -join ' ') }` → every line must say `45 45 45` (PS 5 has no `Format-Hex -Count`; that flag is PS 7+) |
| 4a | `/skill-doctor` rows | NOT VERIFIED | I can't run it: it's a user-typed command | type `/skill-doctor` in Claude Code |
| 4b | `paths:` auto-activation | DONE | Reading `counter.component.scss` added `cssLayer` to my skill listing. Reading `counter.component.ts` added `angularComponentStructure`. Reading `app.routes.ts` added `auth-and-logging`. None of them were listed before. Tested with the Read tool, not an IDE file-open (the IDE connection was down). | In a fresh session, ask Claude to read `src/app/app.routes.ts` and then ask "which skills are available now?" |
| 5a | `preflight.mjs`, servers up | DONE | `OK dev server :4202` / `OK mongodb :27017` / `OK branch != main`, exit 0 | `node scripts/preflight.mjs` |
| 5b | `preflight.mjs`, servers down | DONE | simulated with a dead port: two FAIL lines, exit 1 | `$env:MONGO_PORT=27999; node scripts/preflight.mjs --port 4299; $LASTEXITCODE; Remove-Item Env:MONGO_PORT` |
| 5c | `preflight.mjs --visual` | **BROKEN** | `FAIL gstack browse binary: C:\Users\danwe\.claude\skills\gstack\browse\dist\browse missing`, but the folder has `browse.exe`. It always fails on Windows. | `node scripts/preflight.mjs --visual` |
| | | | **Fix (one line):** in `scripts/preflight.mjs` use `report('gstack browse binary', existsSync(gstack) \|\| existsSync(gstack + '.exe'), …)` | |
| 5d | `breadcrumbs-check.mjs` stale entries | DONE | exactly 12 `stale entry` lines (services 3, models 4, pages 5), exit 1 | `node scripts/breadcrumbs-check.mjs` |
| 5e | `breadcrumbs-check.mjs` "not mentioned" | **BROKEN** | about 130 `not mentioned` lines, including every `*.spec.ts` in `core/services`. The skill says specs do not earn a line, but the checker still demands them, so the skill's "re-run until `BREADCRUMBS: clean`" can never finish for `core/services`. | `node scripts/breadcrumbs-check.mjs \| Select-String 'spec.ts'` |
| | | | **Fix (one line):** in the children loop add `if (/\.spec\.ts$\|^index\.ts$/.test(child)) continue` | |
| 5f | `techdebt-report.mjs list` / `prepare` | DONE | `list` printed 7 reports, exit 0. `prepare --scope working-tree` printed `REPORT_PATH: …/techdebt-2026-10-10.md`, `PRUNED: techdebt-2026-04-14.md` (one report), `KEPT: 6`, and a 15-row TREND table, exit 0. A second run on the same day pruned nothing. Prune undone with `git checkout -- .claude/techdebt-reports`. | `node scripts/techdebt-report.mjs list` then `node scripts/techdebt-report.mjs prepare --scope working-tree` then `git checkout -- .claude/techdebt-reports` |
| 5g | `github-sync-gate.mjs` | DONE | `GATE: run` + BRANCH/DIRTY/AHEAD-BEHIND/WORKTREE/CLEANUP, exit 0. With a temporary `notes/github-sync/2026-10-10.md` it printed `GATE: already-ran 2026-10-10 (…)` (marker deleted afterwards). | `node scripts/github-sync-gate.mjs` |
| 6a | preflight skill | DONE | Skill body is 18 lines and only says to run the script; I ran `node scripts/preflight.mjs` (OK ×3). No curl/mongosh. | say "run preflight" |
| 6b | github-sync skill, gate injection | DONE | The loaded body opened with the computed `GATE: run / MARKER: … / BRANCH: chore/skill-authoring-standard / DIRTY: 1 …` block, so the `!` injection works. Ran `gh pr list` (PRs #367, #366) and `git branch --merged`. I did not pull (0/0 behind), delete anything, or write the marker. | say "sync github" |
| 6c | github-sync skill, stash step | **BROKEN** | §2 says ``DIRTY > 0 → `git stash` first, pop after``. The stash stack is shared by all 4 checkouts, so a bare `pop` can apply another slot's stash. | `Select-String .claude\skills\github-sync\SKILL.md -Pattern 'git stash'` |
| | | | **Fix (one line):** replace with "DIRTY > 0 → stop and ask the Human to commit or set work aside; never bare `git stash`/`pop` (the stash stack is shared across worktrees)" | |
| 6d | breadcrumbs skill | DONE | Ran the checker first. Rewrote only `src/app/pages/breadcrumbs.md` in the skill's table format. Re-run: `{"seam":"src/app/pages","present":true,"stale":[],"unmentioned":[]}`, and the total went from 6 to 5 seams needing attention. Edit reverted. | say "refresh the breadcrumbs", then `node scripts/breadcrumbs-check.mjs --json` |
| 6e | techdebt skill | NOT VERIFIED (in-flow lint/knip) | `prepare` ran and printed REPORT_PATH. Scope was `0 staged source files`, so the skill correctly wrote the 2-line "clean, nothing in scope" report and stopped. It never reached `npm run lint` / `audit:deadcode`. I ran both by hand: `npm run lint` exit 0 (0 errors, 50 warnings); `npm run audit:deadcode` exit 1 (knip: 3 unused files, 26 unused exports, 22 unlisted deps… and because of `&&`, depcheck never runs once knip fails). Note: "working-tree" means **staged files only** (`git diff --cached`). | `git add <some .ts>` first, then say "audit tech debt, working-tree scope", then `git restore --staged <file>` |
| 6f | cssLayer skill | DONE | Wrote `src/app/shared/_scratch/scratch.component.scss` (glass card: `--bg-glass`, `--blur-glass`, `--border-glass`, `--radius-md`, `--shadow-glass`; five groups). Breakpoint uses the local mirror `$break-tablet: 900px; // mirrors src/styles.scss` with `@media (min-width: $break-tablet)`. Both verify greps were empty (exit 1); `npx sass` compiled, exit 0. Confirmed `angular.json` has no `stylePreprocessorOptions`, so the mirror rule is justified. File deleted. | Both greps are in `.claude/skills/cssLayer/SKILL.md` §Verify. PS equivalent: `Select-String <file> -Pattern '^\s*\.c-[a-z]'` |
| 6g | angularComponentStructure skill | DONE | Scratch `.ts` had sections 1–6 in order; CRDUL contiguous (`addItem`, `findItem`, `removeItem`, `renameItem`, `listItems`) with `toggle()` after it. The only `_` member is `private readonly items_ = signal…` (exposed via `asReadonly()`). Semicolon grep empty; no `@Input`/`@Output`/`BehaviorSubject`/`any`/constructor; `npx eslint` exit 0. File deleted. | ask for the scratch component, then `npx eslint src/app/shared/_scratch/scratch.component.ts` |
| 6h | save-plan dry run | DONE | Similarity: `no similar plans … safe to save as new`. `next-plan-number.mjs` → **397** (395 is taken by `395-gemini-model-chain-daily-quota-fallback`), so the H1 became `# Plan 397`. `todo-query append` exit 0 (+5 lines). `scope-check --arch` → `ARCH: ok INV-1, INV-3`, exit 0. `Snapshot: 8e61f0ce…` from `git rev-parse origin/main`. No commit, no push. `todo.md` restored and the plan file deleted. | follow the brief's fixture step |
| 6h′ | save-plan notes | info | (1) In a `wt-N` slot the skill says a Worker skips Phase 1 (number + ledger); I ran them only because the brief asked. (2) The skill says `append` "inserts under `### Plan NNN — <Title>`", but the script inserts the file verbatim, so the caller must write that heading. (3) Shape lint on the fixture itself: `supplier.service.ts` and `suppliers-list.component.ts` don't exist (they are `supplier-data.service.ts` and `supplier-list/`), and A1/A2 lack the `— <target>` suffix. | — |
| 6i | brief-detection | **BROKEN** | Gate shown: the a/b/c **brief** gate; you chose **b**. But §1 "Plan Contract shape check (always first)" matches any message that contains `## Atomic Sub-tasks` or a `# Plan …` H1, and your embedded save-plan fixture has both. Read literally, the skill would have routed this whole brief to save-plan Phase 0. I overrode it by hand. The new version on this branch keeps the same rule (`.claude/skills/brief-detection/SKILL.md` §1). | paste this same brief into a fresh session on the branch |
| | | | **Fix (one line):** in §1 add "Ignore headers inside fenced blocks or under a fixture/example section; if `## Goal` + `## Steps` + `## Done when` are also present at top level, it is a brief." | |
| 6j | auth-and-logging skill | DONE | Checklist shown, ending with `node scripts/pre-commit-security-grep.mjs`, exit 0. `authGuard` and `userService.isLoggedIn()` exist where the checklist says. Caveat: the grep scans **staged files only**, so with nothing staged exit 0 proves nothing. | `node scripts/pre-commit-security-grep.mjs` (stage the changed files first) |
| 6k | worktree-setup frontmatter + model listing | DONE | `disable-model-invocation: true` at `.claude/skills/worktree-setup/SKILL.md:4`. It never appeared in my skill listing after the switch (the other 9 did). | `Select-String .claude\skills\worktree-setup\SKILL.md -Pattern 'disable-model-invocation'` |
| 6l | worktree-setup in the `/` menu | NOT VERIFIED | I can't see your `/` menu | type `/worktree` in Claude Code and check it autocompletes |
| 7 | Evals | DONE | `evals/evals.json` under cssLayer, angularComponentStructure and save-plan: 1 eval each, **8 assertions** each (≥ 6) | `node -e "for (const s of ['cssLayer','angularComponentStructure','save-plan']) { const j=require('./.claude/skills/'+s+'/evals/evals.json'); console.log(s, j.evals.map(e=>e.assertions.length)) }"` |
| X1 | Kit-first rule (ADR 0018) | **NOT DONE** | `AGENTS.md`: kit-owned files change in `../ai-workflow-kit` first. The kit still has the old 14 skills (`core/.claude/skills/elegant-fix`, `update-docs`, `packs/angular/.claude/skills/breadcrumb-navigator`, `angular-pipe-logic`…) and no skills branch. `docs/workflow-kit/kit-owned.json` still lists the retired paths. The diff report lists that last point as a follow-up, but the order is reversed. | `Get-ChildItem ..\ai-workflow-kit -Recurse -Filter SKILL.md \| Select FullName` |
| X2 | `/refactor` description | minor | `.claude/commands/refactor.md:8` still says cssLayer is about "CSS layer ordering, BEM naming", which no longer matches the skill (engines, tokens, five groups) | `Select-String .claude\commands\refactor.md -Pattern 'BEM'` |

## Smaller observations (not BROKEN)

- `preflight.mjs`: a detached HEAD (how slots sit at origin/main) passes `branch != main`. The code comment says "handled below", but nothing handles it.
- `github-sync` marker `notes/github-sync/<date>.md` is not git-ignored, so each sync leaves an untracked file in the slot.
- The diff report claims "every retired-skill reference updated"; row 2c shows one was missed.
- 6 `breadcrumbs.md` footers still say `Updated by: breadcrumb-navigator` (harmless, will go when each map is refreshed).

## Cleanup

Undone after the checks:
- techdebt prune: `git checkout -- .claude/techdebt-reports`
- today's 2-line techdebt report: deleted
- `pages/breadcrumbs.md`: `git checkout`
- scratch `_scratch/` folder: deleted
- dry-run plan 397: deleted
- `.claude/todo.md`: `git checkout`
- temporary github-sync marker: deleted

`git status --short` was empty before this report was written. This report is the only untracked file. `.claude/reports/` is not ignored, and you said no commits, so it stays untracked until you decide.
