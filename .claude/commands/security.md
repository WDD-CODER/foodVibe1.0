# /security — Security Path

Use this path for security audits, hardening, authentication review, and vulnerability assessment.

## Loads

- `.claude/standards-security.md` — OWASP top 10, auth patterns, API security, input validation
- `auth-and-logging` skill — authentication guards, mutation logging, auth audit checklist
- `auth-crypto` skill — hashing, encryption, token handling, secrets management

## Invokes

- `security-officer` — runs the security audit pipeline, flags violations, recommends remediations

## Typical flow

1. User specifies scope: full audit / auth subsystem / API routes / frontend guards.
2. `security-officer` reads relevant source files against `standards-security.md`.
3. Findings are classified: Critical / High / Medium / Low.
4. Critical and High findings are fixed immediately (with `ng build` verification).
5. Medium/Low findings are added to `.claude/todo.md` for scheduled remediation.
6. `/cso` (gstack) for infrastructure-level security review.

## Hard rules

- Critical findings block session close — must be fixed before `/ship`.
- Never log secrets, tokens, or PII — even in debug output.
- All auth changes must pass the `auth-and-logging` audit checklist before commit.
- No semicolons in any `.ts` file touched.

## Related commands

- `/cso` — Chief Security Officer mode (infrastructure, ports, dependencies)
- `standards-security.md` — full security standards reference
