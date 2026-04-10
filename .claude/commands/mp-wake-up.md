---
description: Show MemPalace L0+L1 wake-up context for this project (~800 tokens)
allowed-tools: [Bash]
---

# Command: mp-wake-up

Run the MemPalace wake-up for the foodvibe1.0 wing and display the output.

## Step 1

```bash
PYTHONUTF8=1 python -m mempalace wake-up --wing foodvibe1.0
```

Display the full output verbatim. This gives:
- **L0 — Identity**: What this project is (~50 tokens)
- **L1 — Essential Story**: The top 15 highest-importance drawers grouped by room (~750 tokens)

## Step 2

After displaying the output, note briefly:
```
Palace: 5,992 drawers | Wing: foodvibe1.0 | Rooms: plans, src, public, e2e, scripts, backend
Use /mp-search <query> to search semantically.
```

## Fallback

If the command fails (MCP or Python unavailable):
```
MemPalace wake-up unavailable.
Manual: python -m mempalace wake-up --wing foodvibe1.0
Palace status: python -m mempalace status
```
