# Security

## Reporting a vulnerability

Please report a vulnerability privately — never in a public issue:

- through GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability), or
- by email to the author, using the address on the [GitHub profile](https://github.com/WDD-CODER).

Please include:

- what is affected (page, API route or file) and the version or commit you looked at;
- the steps to reproduce it and what an attacker could gain;
- any proof of concept, logs or screenshots, with personal data removed.

You will get an answer as soon as possible. Please give the author reasonable time to fix the issue before
sharing it.

## Secrets policy

- Secrets live only in environment files and the hosting provider's settings; environment files are never
  committed.
- The repository is scanned for secrets on every push and pull request (gitleaks in CI).
- The AI provider's key is used only by the server; the browser never sees it.
