---
status: accepted
date: 2026-07-14
review-by: 2027-01-31
---

# 0004. Full-draft brain proposals over one-line labels

## Context

Merge Gate brain proposals were specified as "path + one-line summary." Agents satisfied the letter with slogans that restated the commit subject (Plan 289 M5 proposed "use ensureLoaded" — already visible in the diff), so approve/skip became vibes-based and the brain stayed sparse relative to real learning. Alternatives considered: MCP/vector memory (rejected again per [[0002-file-based-memory-over-tool-memory]]), Cline-style mandatory read-all-files at session start (token cost, contradicts [[0001-lean-native-workflow]]), and compound-engineering-style auto-capture without confirm (violates [[0003-auto-evoke-brain-on-pr]]).

## Decision

Every brain proposal must carry a full draft body in the required shape (Pattern: Problem/Solution/When to use; Gotcha: What hurt/Why obvious fix wrong/What to do instead; ADR: Context/Decision/Consequences), pass a usefulness gate ("would a cold agent avoid a wrong choice reading only this?"), and render as title-in-banner + fenced draft below. Title-only proposals are invalid; `none durable` stays the common, correct answer for chores. Rules live once in `docs/agent/brain-capture.md`; ship.md, standards-git.md, .cursorrules are pointers.

## Consequences

Easier: approvals judge a real entry, not a label; Cursor and Claude Code can't drift (single canonical doc); templates keep entries one screen. Harder: proposing costs the agent more effort per ship — acceptable, that effort is the point. Re-evaluate if entries trend toward session-dump length or skips disappear.

## Review

At review-by: did the last ~3 approved entries pass without "too thin" edits? Are skips still common?
