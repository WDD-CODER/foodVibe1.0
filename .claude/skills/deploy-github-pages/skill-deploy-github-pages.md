---
name: deploy-github-pages
description: Configures and deploys the foodVibe 1.0 Angular SPA to GitHub Pages. Run only on explicit user request.
---

# Skill: deploy-github-pages

**Trigger:** User says "deploy", "publish app", "set up GitHub Pages", or "deploy to GitHub Pages".
**Standard:** Follows Section 6 (Git & Workflow) of the Master Instructions.

> **Not automatic.** Run only on explicit user request — this skill modifies CI/CD configuration.

---

## Phase 1: Pre-Flight Check `[Procedural — Haiku/Composer (Fast/Flash)]`

**Branch Verification:** Ensure the active branch is `main` or a stable `feat/` branch.

**Build Audit:** Verify `package.json` contains the `build:gh-pages` script.

**Environment Check:** Ensure the repository has a configured `gh-pages` branch or is set to deploy via GitHub Actions.

---

## Phase 2: Build & Optimization `[Procedural — Haiku/Composer (Fast/Flash)]`

**Clean Build:** Run `npm run build` with the `--base-href` flag set for the repository name (e.g., `--base-href "/foodVibe1.0/"`) to ensure assets resolve correctly on GitHub's sub-paths.

**Asset Check:** Verify `dist/` folder contains the correct `index.html` and bundled assets before proceeding.

---

## Phase 3: Deployment Execution `[Procedural — Haiku/Composer (Fast/Flash)]`

**Push to Branch:** Execute `npx gh-pages -d dist/food-vibe-1.0` (adjust to the specific project `dist` folder).

**Remote Sync:** Ensure the deployment commit is pushed to `origin`.

---

## Phase 4: URL Verification `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Link Generation:** Construct the final URL (`https://[user].github.io/[repo]/`).

**Smoke Test:** If UI Inspector (Section 0.4) is requested, suggest a visual check of the live URL to confirm icons and styles loaded correctly.

---

## Completion Gate

Output: `"Deployment successful. App is live at: [URL]"`

Update the session handoff with the deployment timestamp and version if applicable.

---

## Cursor Tip
> Deployment is CLI-heavy. Use Composer 2.0 (Fast/Flash) for Phases 1, 2, and 3 (~95% of the work).
> Reserve Gemini 1.5 Pro for Phase 4 **only** if the build fails due to dependency or base-href pathing issues.
> Credit-saver: ~75% of this skill is Flash-eligible.
