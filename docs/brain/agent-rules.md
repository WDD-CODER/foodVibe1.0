# Agent rules

Short rules every builder reads before it starts, learned from decisions the Human graded wrong (`docs/agent/decision-review.md`). Capped at 30 lines and 2,400 characters (`node scripts/decision-log.mjs rules --check`): to add a rule when full, merge or drop an older one.

- When the plan does not describe a behaviour (on edit, leave, cancel or error), do the simplest thing and log it as a `behaviour:` decision; never add a dialog, confirmation or automatic action.
- [plan-snapshot-advance] A builder never advances a plan's Snapshot line to clear drift; drift stays reported for the Human. (pending — seen once)
- [layered-css-trap] A rule inside @layer components.* loses to unlayered global rules such as the button/input reset (margin: 0; padding: 0) at src/styles.scss:413-422; put a rule that must beat a global reset outside the layer and prove it with a computed-style test.
- [write-with-tools] Write source with Edit/Write, never shell heredocs or node -e (they drop backslashes); read every regex back after writing and test it with Latin letters, not only Hebrew and digits.
- [dialog-patterns] Before building or changing a dialog or form, read "Dialog patterns" in .interface-design/system.md and follow it.
- [money-format] [money-format] Show an amount with formatMoney (src/app/core/engine/rounding.ts:44); never invent a currency format. (pending — seen once)
- [card-port] [card-port] Validation cards use the main folder's port 4200 and ready copy-paste commands with real ids; 4203 is the Human's. (pending — seen once)

## checkers

- [layered-css-trap] A diff that puts a rule in @layer components.* to override an unlayered global (e.g. src/styles.scss:413-422 reset) with no computed-style test is a problem.
- [regex-via-shell] A regex or source written through a shell heredoc or node -e is suspect: report it unless the diff shows it read back correctly and a Latin-letter test.
- [dialog-patterns] A new or changed dialog/form that departs from "Dialog patterns" in .interface-design/system.md is a problem.
- [observation-not-ask] Triage: a decision that only reports what the code does (seen: with no choice to make) is not an ask, even when it names a security or permission keyword; give it noise or accept.
