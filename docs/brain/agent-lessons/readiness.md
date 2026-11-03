# Lessons — readiness
Facts from earlier runs of the readiness role in this project, written by scripts (`node scripts/orch-state.mjs lessons`) and read by the role at launch. At most 40 lines / 3,000 characters, newest last.
- 2026-11-03 run-513-516: plan 513: a Done-when command with the file after -- (pnpm --dir server test -- <file>) was proposed as default but runs the whole suite; check that the runner applies the file filter (vitest run <file>)
- 2026-11-03 run-513-516: plan 513: the goal (every event with a name gets a clientId) contradicted clientSchema (phone required, INV-4) and readiness did not ask; test each success claim against the schemas and invariants it depends on
- 2026-11-03 run-513-516b: parked on environment after ready
