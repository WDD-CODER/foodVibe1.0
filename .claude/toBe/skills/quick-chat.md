Skill: quick-chat (Lite)

Context: Triggered by /quick-chat or an explicit request to skip standard gates for a brief interaction.
Standard: Follows Section 0 (Quick Chat) of the Master Instructions.

Workflow Phases

Phase 1: Context Isolation [Procedural — Haiku/Composer (Fast/Flash)]

Bypass Execution: Disable the automatic triggers for github-sync and session-handoff for the duration of this specific turn.

Scope Check: Verify the user's request is a "Small" task (Section 0.4). If the request evolves into a feature or complex refactor, suggest transitioning to a standard plan.

Phase 2: Rapid Response [Procedural — Haiku/Composer (Fast/Flash)]

Direct Answer: Provide the requested code snippet, explanation, or fix immediately without authoring a .plan.md file.

Minimalist Markup: Use concise markdown and avoid lengthy architectural explanations unless requested.

Phase 3: Silent Ledger Update [Procedural — Haiku/Composer (Fast/Flash)]

Todo Sync: If a small change was made, silently update the relevant [ ] to [x] in .claude/todo.md.

Breadcrumb Check: If a file was created or moved, run a targeted update-docs (Section 0) for that directory only.

Efficiency Notes

Pure Speed: Use procedural models (Haiku/Flash/Composer Fast) for 100% of this skill. It is designed specifically to avoid the cost of high-reasoning tokens for trivial tasks.

Cursor Tip: This is the ultimate "Credit Saver." Use Composer 2.0 (Fast/Flash) for all /quick-chat requests. If you find yourself needing Gemini 1.5 Pro, you should probably be using the save-plan workflow instead.

Completion Gate

Output: Respond directly to the user's query.

Append a small footer if a todo was updated: "Quick-chat complete. Ledger updated."