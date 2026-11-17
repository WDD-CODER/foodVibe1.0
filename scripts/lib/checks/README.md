# scripts/lib/checks/ — the diff checks

`node scripts/kit-checks.mjs` loads every `*.mjs` file in this folder, in file-name order, and runs it on what the
branch adds. It runs by itself in the orchestrator's per-plan gate, in `/ship` on every lane and in the project's CI
job `kit-checks`. A check is a deterministic script: no model call, no network.

A check module exports (as named exports or as `default`):

```js
export const id = 'my-check'                    // stable, printed in findings
export async function run(ctx) {                 // optional: the findings on this branch
  return [{ rule: 'my-rule', file: 'src/x.scss', line: 12, hint: 'use the --space-md token' }]
}
export async function counts(ctx) {              // optional: debt counts over the whole tree, for the ratchet
  return { 'my-kind': { 'src/x.scss': 2 } }
}
```

`ctx` = `{ root, base, plan, planText, items, config, note }`:

- `items` — what the branch adds (`scripts/lib/diff-items.mjs`); `null` when the baseline is shown or lowered.
- `planText` — the plan the branch builds, or `null` (CI has no plan): a check that compares with a plan section
  skips with `ctx.note('…')`.
- `config` — the rendered settings (`CHECKS_CONFIG` in `scripts/kit-checks.mjs`).

Rule data of the form "a file that matches X must also show Y" goes through `scripts/lib/diff-rules.mjs`.

Counts are debt only (copies, raw values, gaps), never the number of classes or components. A count above the baseline
(`paths.debtBaseline`) fails; `node scripts/debt-baseline.mjs --lower` writes it down after a branch removed debt.
