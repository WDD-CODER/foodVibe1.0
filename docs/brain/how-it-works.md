# FoodVibe Second Brain — visual tour

> Distilled project memory that survives chat compaction.  
> **Not** the rulebook (`AGENTS.md`) and **not** today's todo list.

---

## The big picture

```mermaid
flowchart TB
  subgraph ephemeral["💨 Ephemeral"]
    CHAT["Chat / agent session"]
  end

  subgraph now["📋 Now / in flight"]
    TODO[".claude/todo.md"]
    STATE["docs/session-state.md"]
    SESS["sessions/YYYY-MM-DD.md"]
    HAND["notes/session-handoffs/"]
  end

  subgraph brain["🧠 Second brain — docs/brain/"]
    BRIEF["projectbrief.md"]
    ADR["decisions/"]
    PAT["patterns/"]
    GOT["gotchas.md"]
    GLOSS["glossary.md"]
  end

  subgraph rules["📐 How we work"]
    AGENTS["AGENTS.md"]
    AGENTDOCS["docs/agent/*.md"]
  end

  CHAT -->|"load-bearing facts"| STATE
  CHAT -->|"milestone notes"| SESS
  CHAT -->|"propose at push/PR"| brain
  brain -->|"read on unfamiliar work"| CHAT
  AGENTS -->|"conventions"| CHAT
```

| Layer | Lifetime | Question it answers |
| --- | --- | --- |
| Chat | Minutes–hours | What are we doing *right now*? |
| Session / todo | Days | What's open / blocked? |
| **Brain** | Months–years | Why did we choose this? What bit us? |
| AGENTS / standards | Ongoing rules | How am I *allowed* to code? |

---

## Folder map — `docs/brain/`

```text
docs/brain/
├── index.md            ← 🗺️  reading order + maintenance
├── how-it-works.md     ← 👀  this visual tour
├── projectbrief.md     ← 🎯  what FoodVibe is + hard constraints
├── gotchas.md          ← ⚠️  traps that already hurt
├── glossary.md         ← 📖  domain vocabulary
├── decisions/          ← 🏛️  ADRs (append-only)
│   ├── 0001-lean-native-workflow.md
│   ├── 0002-file-based-memory-over-tool-memory.md
│   └── 0003-auto-evoke-brain-on-pr.md
└── patterns/           ← ✅  proven solutions (one file each)
    ├── signals-only-state.md
    ├── gemini-backend-proxy.md
    └── tombstone-soft-delete.md
```

```mermaid
mindmap
  root((docs/brain))
    projectbrief
      product goals
      stack
      hard constraints
    decisions
      ADRs
      never edit in place
      supersede instead
    patterns
      signals-only
      Gemini proxy
      soft-delete
    gotchas
      what hurt
      what to do instead
    glossary
      canonical keys
      tombstone
      entityType
```

---

## What we save (and what we don't)

```mermaid
flowchart LR
  subgraph YES["✅ Save to brain"]
    Y1["Architectural decisions"]
    Y2["Proven patterns"]
    Y3["Gotchas / traps"]
    Y4["Domain terms"]
    Y5["Product brief / constraints"]
  end

  subgraph NO["❌ Keep elsewhere"]
    N1["Today's checklist → todo.md"]
    N2["In-flight status → session-state"]
    N3["Milestone logs → sessions/"]
    N4["Coding rules → AGENTS.md"]
    N5["Chat dumps / noise"]
  end
```

| Save here | Example | Skip / put elsewhere |
| --- | --- | --- |
| Decision | “File-based memory over MCP memory” | “Working on Plan 289 M4 today” |
| Pattern | “Signals only — no BehaviorSubject” | Full Angular style guide |
| Gotcha | “Don’t `worktree remove` from inside the worktree” | Transient build error you already fixed |
| Glossary | “Tombstone = soft-delete to TRASH_*” | Temporary branch names |

---

## Capture loop (confirm-to-write)

Nothing lands in the brain without you.

```mermaid
sequenceDiagram
  participant Dev as You / agent session
  participant Gate as Push / PR / Merge Gate
  participant GH as GitHub sticky comment
  participant Brain as docs/brain/

  Dev->>Gate: push feature/fix/chore branch
  Gate->>Dev: propose Brain capture block
  Gate->>GH: upsert reminder comment
  alt brain approve
    Dev->>Brain: write / append entry
  else brain skip / brain:none
    Dev-->>Brain: no write
  else brain edit …
    Dev->>Dev: revise proposal
    Dev->>Brain: write after re-approve
  end
```

**Replies you can send**

| Reply | Effect |
| --- | --- |
| `brain approve` | Write the proposed entry |
| `brain skip` / `brain:none` | Explicit no-op |
| `brain edit …` | Change the draft, then approve |

Silent auto-write is **forbidden**. See [[0003-auto-evoke-brain-on-pr]].

---

## When agents open which file

```mermaid
flowchart TD
  START([Unfamiliar work or big choice?]) --> INDEX[Read index.md]
  INDEX --> Q{What's the need?}

  Q -->|What is this product?| BRIEF[projectbrief.md]
  Q -->|Already decided?| ADR[decisions/]
  Q -->|How do we usually solve X?| PAT[patterns/]
  Q -->|Something weird / costly trap| GOT[gotchas.md]
  Q -->|Unknown term| GLOSS[glossary.md]
  Q -->|Rules / lint / Angular style| RULES[AGENTS.md + docs/agent/]
```

---

## Related folders (not the brain)

| Path | Job |
| --- | --- |
| `docs/session-state.md` | Current work snapshot |
| `.claude/todo.md` | Active task checklist |
| `sessions/` | Per-day execution summaries |
| `notes/session-handoffs/` | End-of-day handoffs (legacy path) |
| `plans/` | Feature plan contracts |
| `AGENTS.md` + `docs/agent/` | Hard rules & standards |

---

## One-liner

> **Chat forgets. Todos expire. The brain is what we choose to remember forever — in git, as Markdown, with your OK.**
