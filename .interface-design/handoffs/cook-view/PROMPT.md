# Prompt for Claude Code

Copy this into Claude Code, opened at the root of the foodVibe1.0 repo, after placing this folder in the repo.

---

Read `design_handoff_cook_view/README.md` fully, then `design_handoff_cook_view/CURRENT-STATE.md`. Open `design_handoff_cook_view/designs/Cook View A.html` in a browser as the visual reference (use `Cook View A Breakpoints.html` to check the four widths). The HTML is a reference, not code to copy: implement in the Angular app with its existing tokens, `.c-*` classes and `lucide-angular`. Keep Heebo.

Before starting, ask me about the three open decisions in the README ("Decisions the prototype did not make"): recipe photo hero, desktop scroll model, scale-to-ingredient confirm modal. Recommendations are listed there. The "Gap resolutions" section is already decided; follow it (it adds countdown pause/reset service methods, so step 6 includes service changes and tests).

Then follow "Implementation order" one step at a time. After each step: run `npm run lint`, `npm run lint:icons` and the unit tests, summarise what changed, and stop so I can test on phone, tablet and desktop in light and dark. Continue only when I say so.

Rules:
- Preserve every existing behaviour listed under "Behaviour that already exists".
- Steps 1 and 2 touch shared components (header, chips, `.c-tab-pill`, `.c-icon-btn`); after them, check dashboard, inventory, recipe book, menu library, suppliers and venues in light mode.
- Add new translation keys through the project's usual flow.
- No emoji; no hard-coded colours outside the token table.
- Delete the old classes listed in the class map when they become dead.
