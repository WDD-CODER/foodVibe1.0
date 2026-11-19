---
name: default
description: Product defaults for FoodVibe — make, turn on, turn off or list a default (a behaviour every plan must keep), and record the Human's repeated remarks so a repeat is offered as a default. Use when the Human says "make this a default", "this should always…", "default on <id>", "default off <id>", "default yes <id>", "default no <id>", types /default, or corrects how something should look or behave in a way meant to hold beyond one spot ("not a scroll bar here — use the guide arrows").
allowed-tools: Read, Grep, Glob, Bash(node scripts/product-defaults.mjs *), Bash(node scripts/inventory.mjs *)
---

# /default — product defaults

The contract is `_shared/product-defaults.md` (project-owned). The remarks are `docs/brain/remarks/*.jsonl` (one file per
branch and day). Every write goes through `node scripts/product-defaults.mjs`; never edit the contract by hand here.
A default becomes `on` only from the Human's own words in this chat: `default yes <id>`, "make this a default: …",
`/default …`, `default on <id>`. Never turn one on because a check, a plan or an agent suggested it.

## 1. A remark (no command typed)

The Human corrects a look or a behaviour and the correction is meant to hold beyond this one spot (a rule about every
container, form, list, page — not a one-off fix). Record it at once, before you go on with the work:

`node scripts/product-defaults.mjs remark --tag <id> --text "<the Human's words, one line>"`

- `<id>`: lower-case words joined with `-`, naming the rule, not the spot (`scroll-arrows`, not `results-panel`). Reuse
  the tag an earlier remark used for the same rule (`ls docs/brain/remarks/` and read the tags) so repeats count.
- `DEFAULTS: noted …` → say nothing more about it.
- `DEFAULTS: suggest <id> — n times — …` → end your answer with one line:
  `You asked for this <n> times: <the rule, one sentence>. Make it a default?` and the replies
  `default yes <id>` ⏎ · `default no <id>` ⏎.
- `already a default` → nothing to offer.

## 2. `default yes <id>`, "make this a default: <rule>", `/default <rule>`

No second question: the yes is the turn-on. Draft the entry, then write it `on`:

1. **rule** — one sentence a user would recognise (from the remarks of that tag, or the Human's words).
2. **trigger** — `editable-form`, `write-endpoint`, `list`, `destructive-action` or `screen` when one fits; else
   `custom` with `--words "<RegExp the plan text matches>"` (e.g. `\bscroll(?:able|ing)?\b`).
3. **how** — the existing piece that does it: look it up in `docs/brain/inventory.md` (or `docs/brain/component-families.md`);
   name the file or family. No piece yet → name where it will live and say so in the answer.
4. **check** — the rule data of a diff check when a file pattern can prove it
   (`files: <globs>; trigger: <regex>; evidence: <regex>; in: <globs>`), else `--card "<page · one action · result>"`.
5. Run `node scripts/product-defaults.mjs add --id <id> --rule "…" --trigger <t> [--words "…"] --how "…" [--check "…" | --card "…"]`.
   A rule check also records the existing gaps (`DEBT: added default.<id>`): only new code is held to it.
6. Answer with the `DEFAULTS: on <id>` line and the entry's rule. The contract and baseline change ride the current
   branch (on `main`: tell the Human it needs a branch).

**An id the contract already has** (a `proposed` entry `/plan` or a run asked about, `default yes <id>` or
`default on <id>`): `node scripts/product-defaults.mjs on --id <id>`, adding `--how "…"` and `--check "…"` / `--card "…"`
(steps 3–4) when the entry still holds a placeholder — `on` refuses an entry with no real how or check.

## 3. `default no <id>`, `default off <id>`

- **An id the contract already has:** `node scripts/product-defaults.mjs off --id <id>`.
- **A suggestion with no entry yet** (a remark tag): `node scripts/product-defaults.mjs add --id <id> --rule "…" --trigger <t> --how "(not used)" --card "(off)" --status off`
  — an `off` entry is remembered and never offered again.

## 4. `/default list`

`node scripts/product-defaults.mjs list` and print its lines as they are.

## At plan time and at the end of a job

- `/plan`: a draft that triggers a `proposed` default asks `turn on <id>? <rule> — default yes <id> | default no <id>`,
  all such questions in one block; the answer is written as above and the plan gets its `## Defaults` row.
- `/ship`: before the commit, record (section 1) every correction of this job not recorded yet.
