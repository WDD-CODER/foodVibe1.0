# Validate Agent References

Periodic health check that verifies all internal links in the agent guidance system are valid. Run monthly or after renaming/moving agent files.

## Expected File Inventory

### Agent personas (`.claude/agents/`)
- `team-leader.md`
- `software-architect.md`
- `product-manager.md`
- `breadcrumb-navigator.md`
- `qa-engineer.md`
- `security-officer.md`

### Skills (`.claude/skills/*/SKILL.md`)
- `save-plan/SKILL.md`
- `commit-to-github/SKILL.md`
- `cssLayer/SKILL.md`
- `add-recipe/SKILL.md`
- `github-sync/SKILL.md`
- `techdebt/SKILL.md`
- `update-docs/SKILL.md`
- `elegant-fix/SKILL.md`
- `angularComponentStructure/SKILL.md`
- `auth-and-logging/SKILL.md`
- `session-handoff/SKILL.md`
- `breadcrumb-navigator/SKILL.md`
- `deploy-github-pages/SKILL.md`
- `worktree-session-end/SKILL.md`
- `worktree-setup/SKILL.md`
- `auth-crypto/SKILL.md`
- `angular-pipe-logic/SKILL.md`
- `finalize-docs/SKILL.md`
- `quick-chat/SKILL.md`

> Note: `end-session/SKILL.md` is a deprecated redirect stub — not a functional skill. Intentionally kept as a pointer only.

### Cursor rules (`.cursor/rules/`)
- `add-recipe-must-use-skill.mdc`
- `git-commit-must-use-skill.mdc`
- `lucide-icons-must-register-in-app-config.mdc`
- `save-plan-must-use-skill.mdc`
- `scss-styling-must-use-cssLayer.mdc`
- `session-start.mdc`
- `session-end.mdc`
- `core-angular.mdc`
- `angular-component-structure.mdc`
- `translation.mdc`
- `security.mdc`

### Cursor commands (`.cursor/commands/`)
- `add-recipe.md`
- `commit-github.md`
- `deploy-github-pages.md`
- `quick-chat.md`

## Checklist

1. **Expected files** — For each file in the inventory above, verify it exists at the listed path.

2. **Skill triggers** — For every skill listed in `.claude/copilot-instructions.md` Section 0, verify the `SKILL.md` file exists at the referenced path.

3. **Cursor rules** — For every `.mdc` file in `.cursor/rules/`, verify the linked SKILL or section path exists.

4. **Cursor commands** — For every `.md` file in `.cursor/commands/`, verify the linked SKILL path exists.

5. **Markdown links** — Scan all `.md` files in `.claude/`, `agent.md`, and `agent.md` for `[text](path)` links. For each relative link, verify the target file exists. Report broken links.

6. **Breadcrumbs** — For each `breadcrumbs.md` file, verify that the files listed in its Navigation table still exist.

## Execution

```bash
# Verify all expected agent files exist
for f in team-leader software-architect product-manager breadcrumb-navigator qa-engineer security-officer; do
  [ -f ".claude/agents/$f.md" ] || echo "MISSING: .claude/agents/$f.md"
done

# Verify all expected skill files exist
for s in save-plan commit-to-github cssLayer add-recipe github-sync techdebt update-docs elegant-fix angularComponentStructure auth-and-logging session-handoff breadcrumb-navigator deploy-github-pages worktree-session-end worktree-setup auth-crypto angular-pipe-logic finalize-docs quick-chat; do
  [ -f ".claude/skills/$s/SKILL.md" ] || echo "MISSING: .claude/skills/$s/SKILL.md"
done

# Scan for broken markdown links in agent system files
rg "\[.*?\]\((\.claude/|\.cursor/|plans/)[^)]+\)" agent.md agent.md .claude/ .cursor/ --type md -o
```

Cross-check each path printed above against the filesystem. Any path that does not resolve to a real file is a broken link.

## Output

```
## Agent Reference Validation — [Date]

### Inventory Check
- Expected agents: 6 — found: [count]
- Expected skills: 19 — found: [count]
- Expected cursor rules: 11 — found: [count]
- Expected cursor commands: 4 — found: [count]

### Link Check
- Links scanned: [count]
- Broken links: [count]
  - [file:line] -> [broken target]

### Summary
- Missing files: [list or "none"]
- Broken links: [list or "none"]
```
