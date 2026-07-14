#!/usr/bin/env node
/**
 * Format the sticky Brain capture reminder body for PR comments.
 * Heuristic only — no LLM. Reads optional env / argv for title and changed files.
 *
 * Usage:
 *   node scripts/brain-capture-comment.mjs
 *   node scripts/brain-capture-comment.mjs --title="…" --files="a.md,b.md" --findings="…"
 *
 * Env (used by the workflow when set):
 *   PR_TITLE, CHANGED_FILES (newline- or comma-separated), DEAD_REF_FINDINGS
 *
 * Always exits 0. Prints the markdown body to stdout.
 */
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const eq = arg.indexOf('=')
    if (!arg.startsWith('--') || eq === -1) return [arg.replace(/^--/, ''), true]
    return [arg.slice(2, eq), arg.slice(eq + 1)]
  })
)

const title = args.title || process.env.PR_TITLE || '(untitled PR)'
const rawFiles =
  args.files ||
  process.env.CHANGED_FILES ||
  ''
const files = String(rawFiles)
  .split(/[\n,]/)
  .map((s) => s.trim())
  .filter(Boolean)
const findings = (
  args.findings ||
  process.env.DEAD_REF_FINDINGS ||
  ''
).trim()

const fileList =
  files.length === 0
    ? '_No file list available — check the PR diff._'
    : files
        .slice(0, 40)
        .map((f) => `- \`${f}\``)
        .join('\n') + (files.length > 40 ? `\n- …and ${files.length - 40} more` : '')

const findingsBlock =
  findings.length > 0
    ? `### Advisory dead-ref findings\n\n\`\`\`\n${findings}\n\`\`\`\n`
    : '### Advisory dead-ref findings\n\n_None (or check not run)._\n'

const body = `<!-- brain-capture-bot -->
## Brain capture reminder

Auto-evoke (confirm-to-write). Drafting stays with the agent session — this comment is visibility only. See \`docs/brain/index.md\` and ADR \`docs/brain/decisions/0003-auto-evoke-brain-on-pr.md\`.

**PR:** ${title}

### Checklist

- [ ] Durable learning from this PR? (gotcha / pattern / decision / **none**)
- [ ] If yes: agent drafted path + title **plus full draft body** in Merge Gate (per \`docs/agent/brain-capture.md\` — a title-only proposal is invalid)
- [ ] Confirm write: \`brain approve\` — or skip: \`brain skip\` / \`brain:none\` / label \`brain:none\`
- [ ] Or revise: \`brain edit …\` then re-approve

### Heuristic changed files (not a draft)

${fileList}

${findingsBlock}
**Never silent-write** to \`docs/brain/\`. Reply in chat or ask the agent after Merge Gate.
`

process.stdout.write(body)
process.exit(0)
