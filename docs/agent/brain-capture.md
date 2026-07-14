# Brain Capture Playbook

> Load this file when: proposing or writing any `docs/brain/` entry — `/ship` Phase 4/4.5, the Post-push Merge Gate, or an explicit "save to brain" request.

Goal: every proposal extracts the **judgment that made the session expensive**, not a label that restates the diff. The bar: *a future agent, cold on this area, avoids a wrong choice after reading only this entry.* If a draft can't clear that bar, skipping is the correct outcome — `none durable` is a valid and common answer, especially for chores.

---

## Extraction procedure (run in order, before drafting)

1. **What surprised us or cost rework this session?** Mine `sessions/YYYY-MM-DD.md` ("Decisions", "Reviewer should scrutinize"), review findings, and the conversation — not the diff alone. The diff shows *what* changed; the brain wants *why the obvious path was wrong*.
2. **What rule would have prevented that?** Phrase it as an instruction to a future agent ("gate login reload with `hasLoaded()`"), never as a fact about the code ("uses `ensureLoaded`").
3. **Pick the artifact type** — and split when more than one applies (a costly session often yields a pattern *and* its paired gotcha):
   - **Pattern** — the happy path we'd repeat. Shape: **Problem / Solution / When to use**.
   - **Gotcha** — the trap that looked like success. Shape: **What hurt / Why the obvious fix is wrong / What to do instead**.
   - **Decision (ADR)** — a choice between real alternatives. Shape: **Context / Decision / Consequences** + frontmatter. One decision per file; supersede, never edit in place.
4. **Draft the full file body** from the matching template: `docs/brain/patterns/_TEMPLATE.md`, `docs/brain/decisions/_TEMPLATE.md`, or the gotcha shape stated at the top of `docs/brain/gotchas.md`. Match the length of the good examples ([[defer-singleton-data-ensureLoaded]], [[tombstone-soft-delete]]) — one screen or less, never a session dump. Cross-link related entries with `[[wiki-links]]`.
5. **Write a one-line title** for the banner. The title names the entry; it is **never** the entry.

## Usefulness gate (all must pass, or expand / skip)

- [ ] Would this change a future agent's wrong default? If it only describes what we did, `sessions/` already holds it — skip.
- [ ] Is the trap or exception named explicitly — the audit rule, the "looks done but isn't" case — not just the API name?
- [ ] Does it say when **not** to apply it?
- [ ] Is it more than a restatement of the commit subject / visible diff?
- [ ] Is it the right layer? Coding rules → `AGENTS.md` / `docs/agent/`; status → session-state / todo; changelog → `sessions/`; plan criteria → `plans/`.

**A one-liner-only proposal is invalid.** If there isn't enough judgment to fill the required shape, there is nothing durable — propose `none durable` instead of a slogan.

## Proposal format (ship tree / Merge Gate banner)

- The banner or tree line stays short: **path + quoted one-line title** (keeps the ASCII box readable).
- The **full draft body** follows directly *below* the tree/banner as a fenced markdown block — one fence per entry.
- Two entries in one proposal are allowed and often right (pattern + paired gotcha): one banner line + one fenced draft each.
- `brain approve` writes the fenced body **verbatim** (append to `gotchas.md`, new file under `patterns/`, next-numbered file under `decisions/`). `brain edit …` revises the draft and re-shows it.

## Constraints (unchanged)

- **Never silent-write** — confirm-to-write per [[0003-auto-evoke-brain-on-pr]] always applies.
- Don't move coding rules into the brain; don't duplicate plan Done-when lists or session logs.
