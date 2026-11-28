# Security

## Reporting a vulnerability

Please report it privately to the author. **Do not open a public issue.**

- Use GitHub's private vulnerability report ("Report a vulnerability" on this repository's Security tab) when that button is shown.
- Otherwise, email the author at the address on his [GitHub profile](https://github.com/WDD-CODER).

## What to include

- What the problem is and what someone could do with it.
- The steps to reproduce it, with the page or API route involved.
- The date you saw it, and the browser or tool you used.
- Your contact details, if you want an answer.

Please do not access, change or keep data that is not yours while checking a problem.

## Secrets policy

- Secrets live only in environment files that are never committed.
- The repository is scanned for secrets by gitleaks in CI, on every pull request and every push to `main`.
- The AI key is used only by the server.
