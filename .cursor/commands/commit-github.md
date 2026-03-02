# Commit to GitHub (project skill)

This command will commit **only the changes made in this conversation**.

**Clarification:**
When you run this command (per the skill), *only* the files and edits made explicitly as a result of the current chat/session will be included in the commit. Other staged or unstaged changes present in your working directory will **not** be committed unless they were changed in this session.

**Summary of process (per skill):**
1. **Read and follow** [.assistant/skills/commit-to-github/SKILL.md](.assistant/skills/commit-to-github/SKILL.md) start-to-finish.
2. **Evaluate** which files were edited as part of the current chat/session. Present only these for commit.
3. **Present** a visual plan (Phase 4) in chat, showing only these session changes for branch/commit planning.
4. **Await explicit approval**. Absolutely no `git add`, `git commit`, `git checkout -b`, or `git push` until you approve the plan in this chat.
5. **On approval**, commit/push exactly as planned, update `.assistant/todo.md` for relevant tasks.

**Note:**  
- Only changes that occurred in this chat/session will be included in the commit.
- Other local/untracked changes are ignored unless you specify otherwise.

Always use the referenced skill for naming (`feat/...`, `fix/...`), commit message craft, and process steps.
