# /ship — Session End (chat-scoped commit)

Closes the current session. Repo root = **workspace cwd** (never hardcode a machine path).

Invoking `/ship` **authorizes the agent to commit** this chat’s files after the confirmation
block (or immediately with `--yes`). This is the execute path. For message-only prep without
commit, use `git-agent` instead.

**Aliases / triggers:** `/ship`, `/end-session`, “wrap up”, “ship”, “ship it”, “ship no confirm”.

---

## Modes

| Invocation | Confirmation |
|------------|--------------|
| `/ship` | Show tree + Verify bullets → **wait for Y** (or list edits) → then commit |
| `/ship --yes` / “ship, no confirm” | Show tree + Verify bullets once → **commit immediately** (no wait) |

Push only when the Human also said “push” / “ship and push”. Default = commit only.

---

## Phase 1 — Build gate (HARD)

If dirty or staged files include `.ts` / `.html` / `.scss` / `.css` under `src/` or `server/`:

```bash
ng build
```

- **Fail** → stop. Fix, then re-run `/ship`.
- **Docs/workflow-only** (no app code) → skip build, note `Build: SKIPPED`.

---

## Phase 2 — This-chat file set + confirmation block

### 2.1 Resolve files (NEVER `git add -A` by default)

1. Run: `python scripts/session-manifest-ship.py` (from repo root).
2. Intersect manifest `files` with current dirty paths (`git status --short`).
3. Parse JSON:
   - **`files` non-empty, `overlaps` empty** → stage candidates = that list only.
   - **`overlaps` non-empty** → STOP. Show overlapping branch + paths. Ask: commit
     non-overlapping only? / abort?
   - **`no_manifest=true`** → warn. Do **not** fall back to whole-tree add.
     Prefer files touched in **this conversation** (tool write/edit history ∩ dirty).
     If still unclear → STOP and ask the Human which paths to include.
4. **Override** only if Human explicitly said so (“ship everything”, “include X”,
   “full working tree”).

Flag secrets / `.env` — never stage them.

**Always include** the session wrap path in the stage list (even if not yet dirty):
`/sessions/[YYYY-MM-DD].md` (create/append in Phase 3.0 before `git add`).

### 2.2 Present confirmation block (always, including `--yes`)

Use this exact shape (markdown `text` fence):

~~~text
Branch: [branch-name]

Proposed commit:
  type(scope): subject

  body (why, not what)

Files to stage:
  ├── file1
  ├── file2
  ├── sessions/YYYY-MM-DD.md   (session wrap — same commit)
  └── file3

Verify (you — quick pass):
  • [concrete check tied to this commit]
  • [concrete check]
  • [concrete check]

Approve? (Y / edit list / abort)
~~~

On `--yes`, replace the last line with: `Mode: --yes — committing now.`

### 2.3 Verify bullets (mandatory)

Give the Human a **ready-made evaluation checklist** so they do not invent what to check.

Rules:
- **3–7 bullets**
- Each bullet = one concrete action (“Open X — expect Y”, “Run Z — see W”)
- Derived from **this commit’s paths + this chat’s goal** — not generic QA
- Pass/fail in seconds (glance, one click, one command)
- No vague “check quality” / “make sure it works”

### 2.4 Gate

- **Default `/ship`:** wait for `Y` / list edits / abort. On `Y`, proceed to Phase 3.
- **`--yes` / “no confirm”:** proceed to Phase 3 immediately after printing the block.

---

## Phase 3 — Session wrap + commit + optional push (one shot)

**Goal:** after `/ship` finishes (especially with push), the working tree must **not**
have a leftover dirty `sessions/*.md` that forces a second push. Session wrap lives in
the **same** commit as the shipped files.

### 3.0 Write session wrap BEFORE staging

1. Append (or create) `/sessions/[YYYY-MM-DD].md` with:
   - Branch, date, short summary, files to be committed, Verify bullets
   - `Commit: included in this /ship commit` — **do not** put a real SHA in the file
     (a commit cannot contain its own final hash; printing the SHA is for the
     chat Output summary only)
   - `Push: yes | no` (intent from Human request)
2. Also update `.claude/.session-state-path` / `docs/session-state.md` if that path is
   the active capsule — same rule: write **before** commit, not after push.
3. Todo: mark `[x]` only for items the Human confirmed done this session — do not invent.
   If todo files change, add them to the stage list now.

### 3.1 Stage + commit (single commit — no post-commit wrap edits)

1. `git add` **only** the listed paths **plus** the session wrap file(s) from 3.0
   (never `git add -A` unless Human overrode scope).
2. `git commit` with the proposed Conventional Commit message.
   Include trailer when using Cursor: `Co-authored-by: Cursor <cursoragent@cursor.com>`.
3. **Do not** edit the session wrap again after this commit. No amend-for-SHA.
   Report the real SHA only in the Output summary (`git rev-parse --short HEAD`).

### 3.2 Push (only if Human asked)

1. `git push -u origin HEAD` only if Human said “push” / “ship and push”.
2. After successful commit (and push if any): delete
   `.claude/sessions/<current-branch>/manifest.txt` if it exists.
3. Confirm `git status --short` is clean for this-chat paths. If the session wrap is
   still dirty, you violated 3.0–3.1 — fix before ending (do **not** ask the Human for
   another push for wrap-only dirt you created).
4. Never commit to `main`. Never force-push. Never amend after push.

If on `feat/session-*`, propose a semantic rename in the confirmation block; rename
between commit and push only after Human OK (or as part of `--yes` if they already
approved the new name in the prompt).

---

## Output summary

```
SESSION WRAP — {branch}
Build: PASS | SKIPPED | FAIL
Scope: this-chat ({n} files) | override ({note})
Commit: {sha or none}
Push: yes | no
Verify bullets: {n} shown
Session state: {path}  (staged in same commit — tree clean after push)
```

---

## What /ship does NOT do

| Skipped | On-demand alternative |
|---------|-----------------------|
| Techdebt scan | `/techdebt` |
| Breadcrumb / doc refresh | `/docs-refresh` |
| Session evaluation vs brief | `/evaluate-me` |
| Agent Memory save | `memory_save` / `memory_lesson_save` |
| Plan archive | Rename `.plan.md` → `.done.plan.md` or mark Plan Contract `[x]` |
| Message-only prep (no commit) | `git-agent` |
| Post-push session-file edits | Forbidden — causes leftover dirty tree |
