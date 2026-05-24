---
name: mp-search
description: Semantic search across all 5,992 embedded project drawers using MemPalace. Alias: /recall
allowed-tools: [mcp__mempalace__mempalace_search, mcp__mempalace__mempalace_kg_query, mcp__mempalace__mempalace_traverse]
---

# Skill: mp-search

Search the MemPalace — 5,992 embedded drawers from this project's code, plans, docs, and session history.

**Triggers:** `/mp-search <query>` · `/recall <query>`

---

## Phase 1: Parse Query

Extract everything after `/mp-search` or `/recall` as the search query.

If no query was provided → ask: "What would you like to search for?"

---

## Phase 2: Search

Call:
```
mempalace_search(
  query = <user query>,
  limit = 8
)
```

If the MCP tool is unavailable → output:
```
MemPalace not connected in this session.
Manual search: python -m mempalace search "<query>" --wing foodvibe1.0
```
Then stop.

---

## Phase 3: Display Results

Format output as:

```
MemPalace: "<query>" — {n} results

[1] ROOM: {room} | {filename}
    Similarity: {score}
    ─────────────────────────────
    {verbatim text chunk, up to 250 chars}

[2] ROOM: {room} | {filename}
    ...
```

Group by room if multiple results come from the same room.

If zero results → output:
```
No results found for "{query}" in wing foodvibe1.0.
Try broader terms, or check: python -m mempalace status
```

---

## Phase 4: Deep-Dive (only if user asks)

Trigger: user follows up with "why was X...", "tell me more about X", "what's the history of X"

Call:
```
mempalace_kg_query(entity = "<X>")
```

Display any temporal facts (decisions, changes, invalidations) found for that entity.

If user asks to see connections across rooms:
```
mempalace_traverse(start_room = "<room from results>", max_hops = 2)
```

---

## Inline Rules

- Do NOT pass `wing="foodvibe1.0"` — the wing filter has a ChromaDB index bug. All drawers are in one wing anyway, so results are identical without it
- Never summarize drawer content — show it verbatim (that's the point)
- Similarity scores below 0.05 are weak matches — flag them: "(weak match)"
- Never block on MemPalace availability — fail gracefully with manual CLI alternative
