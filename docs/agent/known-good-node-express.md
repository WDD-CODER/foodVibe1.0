# Known-good packages — node-express

Packages the Human already approved for this stack. The Planner reads every `docs/agent/known-good-*.md` before an
Adopt Check search (`docs/agent/adopt-check.md`): a package listed here for the capability means no search; run
`node scripts/adopt-facts.mjs --pkg=<name>` for fresh facts and write the row.

This file is managed by the kit: do not edit it in a project. A package the Human approves in a project goes back to
the kit with `/kit-feedback` (target: this file), and the next sync brings it to every project on this stack.

| Package | What it does | Licence | Date approved |
| --- | --- | --- | --- |
