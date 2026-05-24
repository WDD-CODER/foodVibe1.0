# /mp-search — MemPalace Knowledge Search

> **SDK stub** — requires MemPalace setup (see `/init-repo` Phase 5d).

## Purpose
Search the MemPalace knowledge base for project context, past decisions, and architectural notes.

## Usage
`/mp-search <query>`

## Execution
Calls `mempalace_search(query="<query>", limit=10)` and presents results.

**Requires MemPalace to be configured.** Run `/init-repo` and follow Phase 5d to set up MemPalace.
