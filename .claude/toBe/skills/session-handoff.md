Skill: session-handoff (Lite)

Context: Triggered by "wrap up", "handoff", or "done".
Standard: Follows Section 0 (Session End) of the Master Instructions.

Workflow Phases

Phase 1: Context Gathering [Procedural — Haiku/Composer (Fast/Flash)]

Status Check: Identify all [x] tasks in .claude/todo.md completed this session.

File Audit: List all files created or modified during the conversation.

Worktree Detection: Confirm if the session took place in a worktree or the main repo.

Phase 2: Narrative Summary [High Reasoning — Sonnet/Gemini 1.5 Pro]

Technical Summary: Write a concise report of the architectural decisions made (e.g., new signals, service changes, or security audits).

Success Evidence: Briefly state the results of the How to verify step for the most recent features.

Next Steps: Explicitly list the "Next Task" from the todo list to ensure zero-latency startup in the next session.

Phase 3: Archive & Cleanup [Procedural — Haiku/Composer (Fast/Flash)]

Doc Writing: Save the handoff to notes/handoffs/<date>-<topic>.md.

Sync Check: Remind the user if a github-sync (Section 0) is needed before closing.

Memory Optimization: Suggest deleting any temporary .plan.md files that are now fully implemented and staged.

Efficiency Notes

Data Gathering: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Synthesis: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 to ensure the handoff is readable and logically sound.

Cursor Tip: Wrap-ups are repetitive tasks. Always use Composer 2.0 (Fast/Flash) to generate the handoff report. It is more than capable of summarizing the current session's history and todo list.

Completion Gate

Output: "Session handoff complete. Report saved to [path]. Ready for the next chef to take over."