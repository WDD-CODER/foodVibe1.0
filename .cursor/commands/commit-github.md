# Commit to GitHub (project skill)

1. **Read and follow** [.assistant/skills/commit-to-github/SKILL.md](.assistant/skills/commit-to-github/SKILL.md) start-to-finish.
2. **Complete Phase 0 before Phase 1:** run techdebt **in working-tree scope only** (only files to be committed; see techdebt SKILL "Scope — Working tree (commit flow)") or use an existing report from this session; handle Spec coverage from the report (add/update specs or list and ask); run the full test suite (`npm test -- --no-watch --browsers=ChromeHeadless`) — if it fails, report and ask "Fix first or proceed?"; then proceed to Phase 1 (Evaluate).
3. When run via this command, include **only files changed in this conversation session**. Other local/untracked changes are ignored unless the user specifies otherwise.
4. **No git writes** (`git add`, `git commit`, `git checkout -b`, `git push`) until the user approves the visual plan in chat.
