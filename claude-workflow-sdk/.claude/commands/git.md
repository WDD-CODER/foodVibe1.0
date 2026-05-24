# /git — Git Operations via git-agent

## Purpose
Git operations via git-agent — commit, push, branch, PR, merge.

## Usage
`/git <natural language request>`

Examples:
- `/git commit my changes`
- `/git create PR`
- `/git merge all branches`
- `/git what's the status`

## Execution
Invokes the `git-agent` via the Agent tool:

```
Agent(
  subagent_type: "git-agent",
  description: "Git operation",
  prompt: "<user's request>"
)
```
