# Validate Agent References

Periodic health check that verifies all internal links in the agent guidance system are valid. Run monthly or after renaming/moving agent files.

## Checklist

1. **Skill triggers** — For every skill listed in `.assistant/copilot-instructions.md` Section 0, verify the `SKILL.md` file exists at the referenced path.

2. **Agent files** — For every agent listed in `agent.md` Agent System table, verify the `.md` file exists in `.assistant/agents/`.

3. **Cursor rules** — For every `.mdc` file in `.cursor/rules/`, verify the linked SKILL or section path exists.

4. **Cursor commands** — For every `.md` file in `.cursor/commands/`, verify the linked SKILL path exists.

5. **Markdown links** — Scan all `.md` files in `.assistant/`, `agent.md`, and `AGENTS.md` for `[text](path)` links. For each relative link, verify the target file exists. Report broken links.

6. **Breadcrumbs** — For each `breadcrumbs.md` file, verify that the files listed in its Navigation table still exist.

## Execution

```powershell
# Quick scan for broken links in agent files
rg "\[.*?\]\((\.assistant/|\.cursor/)[^)]+\)" agent.md AGENTS.md .assistant/ .cursor/ --type md -o | ForEach-Object {
  $path = ($_ -split '\(' | Select-Object -Last 1).TrimEnd(')')
  if (-not (Test-Path $path)) { Write-Host "BROKEN: $_" }
}
```

## Output

```
## Agent Reference Validation — [Date]

- Links checked: [count]
- Broken links: [count]
  - [file:line] -> [broken target]
- Missing skills: [list or "none"]
- Missing agents: [list or "none"]
```
