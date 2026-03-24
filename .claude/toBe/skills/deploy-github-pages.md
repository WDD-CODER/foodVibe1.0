Skill: deploy-github-pages (Lite)

Context: Triggered by "deploy", "publish app", or "GitHub Pages".
Standard: Follows Section 0 (Worktree/Port) and Section 6 (Git) of the Master Instructions.

Workflow Phases

Phase 1: Pre-Flight Check [Procedural — Haiku/Composer (Fast/Flash)]

Branch Verification: Ensure the active branch is main or a stable feat/ branch.

Build Audit: Verify package.json contains the build:gh-pages script.

Environment Check: Ensure the repository has a configured gh-pages branch or is set to deploy via GitHub Actions.

Phase 2: Build & Optimization [Procedural — Haiku/Composer (Fast/Flash)]

Clean Build: Run npm run build with the --base-href flag set for the repository name to ensure assets resolve correctly on GitHub's sub-paths.

Asset Check: Verify that the dist/ folder contains the correct index.html and bundled assets.

Phase 3: Deployment Execution [Procedural — Haiku/Composer (Fast/Flash)]

Push to Branch: Execute npx gh-pages -d dist/food-vibe-1.0 (or the specific project dist folder).

Remote Sync: Ensure the deployment commit is pushed to the origin.

Phase 4: URL Verification [High Reasoning — Sonnet/Gemini 1.5 Pro]

Link Generation: Construct the final URL (e.g., https://[user].github.io/[repo]/).

Smoke Test: If the UI Inspector (Section 0.4) is requested, suggest a visual check of the live URL to ensure icons and styles loaded correctly.

Efficiency Notes

Build & Deploy: Use procedural models (Haiku/Flash/Composer Fast) for 95% of the work. These are purely command-line operations.

Troubleshooting: Use high-reasoning models (Sonnet/Pro) ONLY if the build fails due to dependency or base-href pathing issues.

Cursor Tip: Deployment is a CLI-heavy task. Use Composer 2.0 (Fast/Flash) to run the build and deploy scripts. It is perfectly suited for handling the shell commands and monitoring the output for errors.

Completion Gate

Output: "Deployment successful. App is live at: [URL]"

Update the session handoff with the deployment timestamp and version if applicable.