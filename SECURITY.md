# Security

## Reporting a vulnerability

Please report a vulnerability privately to the author, [Dan Weibren](https://github.com/WDD-CODER), **not** in a public
issue or pull request:

- GitHub's private vulnerability report (the repository's Security tab → «Report a vulnerability»), where it is offered;
- or an email to the author.

If neither is available to you, open an issue that only asks for a private contact, with no details of the problem.

## What to include

- What is affected (page, API route or file).
- The steps to reproduce it.
- The impact you expect: what someone could read, change or break.
- The browser or tool and the date you saw it.

Do not include real personal data, and do not test against other people's accounts.

## Secrets policy

- Secrets live only in environment files that are never committed.
- The repository is scanned for secrets with gitleaks in CI, on every pull request and every push to the main branch.
- The AI key is used only by the server; it never reaches the browser.
