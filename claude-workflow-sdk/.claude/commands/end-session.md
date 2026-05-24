# /end-session — Full Session Close Pipeline

> **SDK stub** — this command requires project-specific configuration.
> Fill in the sections marked `[PROJECT_SPECIFIC]` after running `/init-repo`.

## Purpose
Full session close pipeline (alias for /ship with extended steps).

## Usage
Type `/end-session` at the end of a work session to commit, push, write session state, sync todos, and optionally run diagnostics.

## Execution
Invokes `end-of-session-agent` via the Agent tool with the same prompt as `/ship`, plus optional extensions:
- MemPalace diary write (if configured)
- Techdebt scan
- Breadcrumb/doc refresh

See `/ship` for the core 4-phase pipeline. This command adds the on-demand phases that `/ship` skips.
