# Commit to GitHub — foodVibe 1.0

Evaluates working-tree changes, decides how to split branches and commits, presents the plan as a **visual tree** for approval, then creates branches and commits safely and returns to the default branch.

**Safety rule**: No `git add`, `git commit`, `git push`, or branch creation until the user has explicitly approved the visual tree in chat. Do not create a file in `plans/` for this workflow — the plan is the tree in the conversation.

**Phase 0 must be completed before Phase 1.** Do not run Phase 1 (Evaluate) until Phase 0 is done.

---

## Phase 0 — Tech debt check and test gate (before building commit plan)

Before Phase 1 (Evaluate):

- **Checklist:** (1) If no tech-debt report exists in this session → read `.assistant/skills/techdebt/SKILL.md` and run the analysis **in working-tree scope only** (files to be committed; get the list from `git status` and `git diff --name-only`). Produce the report. (2) If the report lists critical/high items → ask the user: fix first or proceed? (3) If the report has a **Spec coverage** section → add or update those specs so tests pass, or list the files and ask the user. (4) **Run the full test suite:** `npm test -- --no-watch --browsers=ChromeHeadless`. If it fails, report the failure and ask: "Fix before building the commit plan, or proceed anyway?" Do not proceed to Phase 1 until tests pass or the user chooses to proceed. Then continue to Phase 1.

- **If a tech-debt report was already produced in this conversation** (e.g. from workflow step 5.5 or because the user asked for a tech-debt run): **Do not run the techdebt skill again.** Use that existing report. If it listed critical or high-priority items, ask: **"Fix these first, or proceed with the commit plan anyway?"** If the report includes a **Spec coverage** section (files needing `.spec.ts` added or updated), add or update those specs so `npm test -- --no-watch --browsers=ChromeHeadless` passes; if the list is long, list the files and ask: **"Add/update specs for these before building the commit plan?"** then do them if the user agrees. **(4) Run the full test suite:** `npm test -- --no-watch --browsers=ChromeHeadless`. If it fails, report and ask: "Fix before building the commit plan, or proceed anyway?" Then continue to Phase 1.
- **If no tech-debt report exists in this session**: Read `.assistant/skills/techdebt/SKILL.md` and run a quick tech-debt pass **in working-tree scope only** (analysis only for files to be committed; see techdebt SKILL "Scope — Working tree (commit flow)"). If critical or high-priority items exist, list them briefly and ask: **"Fix these first, or proceed with the commit plan anyway?"** If the report includes a **Spec coverage** section, add or update those specs (or list and ask: **"Add/update specs for these before building the commit plan?"**). **(4) Run the full test suite:** `npm test -- --no-watch --browsers=ChromeHeadless`. If it fails, report and ask: "Fix before building the commit plan, or proceed anyway?" Do not block the commit tree indefinitely — the user may choose to proceed. Then continue to Phase 1.

---

## When to Use

- User says "commit to GitHub", "push my changes", "save to branches", or similar
- User wants working changes organized into branches and commits with a reviewable plan first

---

## Phase 1 — Evaluate (read-only)

Per the safety rule above. Gather the full picture: run `git status` and `git diff --stat` (and `git diff` or `git diff --name-only` if needed). Detect default branch: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"`. Do not run `git add`, `git commit`, `git checkout -b`, or `git stash` in this phase. Note modified/untracked `plans/*.plan.md`.

---

## Phase 2 — Decide & Build Plan

1. **One branch vs several**: One branch if all changes are one logical unit. Multiple branches when changes belong to different concerns so each can be reviewed/merged/reverted independently.
2. **One vs several commits per branch**: Prefer multiple commits when it makes revert or refactor easier. One commit when changes are small and inseparable.
3. **Practical rule**: Split so that reverting one commit is straightforward; avoid one giant commit when logical steps are clear.
4. **Branch names**: `feat/<short-name>` or `fix/<short-name>`.
5. **Output**: For each branch — branch name. For each commit — list of file paths and a short commit message (`type(scope): message`).
6. **Plans:** Include related `plans/` file in the commit when scope matches.

---

## Phase 3 — Present Plan & Await Approval

Output the plan **only** in this visual format. No `plans/` file.

**Required format:**

```
[Current: main]
 └── 🌿 Branch: feat/example-branch
      ├── 📦 Commit 1: type(scope): short message
      │    📄 path/to/file1.js
      │    📄 path/to/file2.js
      └── 📦 Commit 2: type(scope): short message
           📄 path/to/file3.js
```

- Use `[Current: main]` (or actual default branch) at the top.
- For multiple branches, add another `└── 🌿 Branch: …` under `[Current: main]`.
- Under each branch: `├──` or `└──` for commits, `📦 Commit N: message`, then `📄 path` for files.

After the tree, ask: **"Approve to proceed, or deny to cancel. No git writes until you approve."**

If the user **denies**: state that no git operations were performed and stop. If they **approve**: proceed to Phase 4.

---

## Phase 4 — Execute (only after approval)

Never erase or discard user changes: no `git reset --hard`, `git clean -fd`, or force-push unless the user explicitly asks. Use stash to preserve work when switching context.

1. **Preserve work**
   If the plan has multiple branches or commits and there are uncommitted changes, stash first:
   ```bash
   git stash push -u -m "commit-skill-work"
   ```

2. **Per branch**
   - Checkout default branch (e.g. `git checkout main`).
   - Create branch: `git checkout -b <branch-name>`.
   - For each commit: restore only the files for that commit (from stash or working tree), then:
     ```bash
     git add <path1> <path2> ...
     git commit -m "type(scope): message"
     ```
   - If stashed: after committing all commits on this branch, stash remaining changes before switching. Ensure every planned change is committed and nothing is dropped.

3. **Between branches**
   Checkout default, create the next branch from default, repeat. Use stash so uncommitted planned changes are never lost.

4. **Return to default**
   ```bash
   git checkout main
   ```

5. **Update todo**
   Open `.assistant/todo.md`. Using committed branch names, messages, and file paths, mark matching tasks as done (`[x]`). Do not change unrelated tasks.

---

## End State

After Execute: all planned changes are committed on the intended branches, current branch is the default, no planned changes left uncommitted, and `.assistant/todo.md` updated for matching tasks.

---

## Recipe builder tab order (canonical)

When changing the recipe-builder page or its child components, keep this Tab order so keyboard-only users can move predictably. Irrelevant controls (e.g. plus/minus buttons) use `tabindex="-1"` and are skipped.

1. **Dish or recipe** — Type toggle (recipe-header).
2. **Name** — Recipe/dish name input.
3. **Main unit** — Primary unit selector (unit-switcher open with Enter/Space; arrows to choose).
4. **Counter value** — Value inside the primary portions/servings input (arrows to change).
5. **Add another measurement unit** — Add-unit button.
6. **Added unit select** — Each secondary unit’s selector (if present).
7. **Value inside new unit** — Each secondary amount input (if present).
8. **Label** — Labels container (open with Enter/Space).
9. **Ingredient index** — Ingredients section header (expand/collapse with Enter/Space).
10. **First ingredient search** — First row ingredient search.
11. **Ingredient rows** — Per row: search (or display), unit select, quantity input; then next row.
12. **Add row** — Add ingredient row button.
13. **Workflow container** — Workflow section header (expand/collapse).
14. **Text area** — Instruction textarea (prep) or first workflow control (dish).
15. **Time value** — Labor-time field (prep) per row.
16. **Add another row** — Add workflow step button.
17. **Logistics container** — Logistics section header (expand/collapse).
18. **Search (logistics)** — Tool search input.
19. **Quantity (logistics)** — Qty input (arrows to change; +/- skipped).
20. **Add (logistics)** — Add tool button.
21. **Items in grid** — Logistics chips (added tools).
22. **Save** — Save recipe/dish button.

---

## Menu intelligence tab order (canonical)

When changing the menu-intelligence page, keep this Tab order so keyboard-only users can move predictably. Guest count +/- and similar controls use `tabindex="-1"` and are skipped.

1. **Menu name** — Text input (initial focus).
2. **Event type** — Trigger button; Enter/Space/ArrowDown open dropdown; ArrowUp/Down move, Enter/Space select; Escape close.
3. **Serving type** — Custom-select (Enter/Space open, Arrow move, Enter/Space select).
4. **Guest count** — Number input (ArrowUp/Down change value; +/- skipped).
5. **Event date** — Date wrap (Enter/Space open picker); date input for value.
6. **Section 1 title** — Button; Enter/Space open section category search.
7. **Section 1 category search** — When open: type to filter, ArrowUp/Down, Enter/Space select; Tab → first dish in section.
8. **Section 1 — Dish 1** — If empty: dish search input (Arrow/Enter/Space to select). If filled: dish name (optional edit), then **sell price** input (Arrow to change). Tab from dish search or sell price → next dish or add-dish.
9. **Section 1 — Dish 2, …** — Same pattern per row.
10. **Section 1 — Add dish** — Button.
11. **Section 2 title**, **Section 2 category search**, **Section 2 dishes**, **Add dish**, …
12. **Add section** — Button.
13. **Toolbar (when open)** — Export/Save etc.; **Save** as final action.

---

## Related

See **GitHub Sync** (`github-sync/`) and **Test-PR-Merge** (`.assistant/commands/`) for pull/PR flows.
