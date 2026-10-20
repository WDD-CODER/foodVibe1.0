# Code QA — accepted API deviations

The `api` layer (`docs/qa/code-qa.md`, plan 414) reports every case that does not behave as expected. A case listed
here is reported as `accepted` instead of as a finding: a known deviation the Human decided to live with for now.

Add a line only after reading the finding and deciding it is not a bug worth fixing yet. Format — one line per case,
the case id exactly as the finding shows it (`<entity>.<kind>.<case>` or `global.<kind>.<case>`):

```
- `<case id>` — <reason> — <YYYY-MM-DD>
```

Remove the line when the server is fixed, so a regression shows up again.

## Accepted

(none yet)
