# Skill: Deploy to GitHub Pages — foodVibe 1.0

Configure and deploy this Angular SPA to GitHub Pages.

## When to Run

**Only on explicit user request.** Trigger phrase: user says "deploy", "publish the app", "set up GitHub Pages", or "deploy to GitHub Pages".

Do NOT run this skill automatically. It modifies CI/CD configuration and requires deliberate intent.

---

## Workflow

### Phase 1 — Preflight

1. Confirm the user wants GitHub Pages (not Vercel, Netlify, or another host).
2. Confirm the repository name — needed for `--base-href`. For this project: `foodVibe1.0`.
3. Run a production build to catch type errors before touching CI config:
   ```bash
   npm run build
   ```
   If the build fails, stop and report the errors. Do not proceed until the build is clean.

### Phase 2 — Angular Build Configuration

Ensure `angular.json` production build uses the correct `base-href`:

```bash
npx ng build --configuration=production --base-href "/foodVibe1.0/"
```

Verify the output directory: `dist/food-vibe1.0/browser/` (adjust if `angular.json` `outputPath` differs).

### Phase 3 — Routing Strategy

GitHub Pages serves static files and cannot handle Angular's HTML5 pushState routing. Choose one:

**Option A — Hash location strategy (recommended for GitHub Pages):**
- In `app.config.ts`, use `withHashLocation()` in `provideRouter(routes, withHashLocation())`.
- URLs become `/#/route` — no 404 on refresh.

**Option B — SPA fallback (requires a 404.html redirect trick):**
- Copy `dist/.../index.html` to `dist/.../404.html` in the build step.
- Requires extra GitHub Actions configuration.

Present the choice to the user if not already configured. Recommendation: Option A.

### Phase 4 — GitHub Actions Workflow

Create or update `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/food-vibe1.0/browser

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Adjust `path: dist/food-vibe1.0/browser`** to match the actual Angular output path from `angular.json`.

### Phase 5 — Secrets & Security

- Do not commit API keys or secrets.
- Reference secrets via `${{ secrets.SECRET_NAME }}` in the workflow.
- Verify `.env*` files are in `.gitignore`.

### Phase 6 — Verify

1. Push to `main` (or trigger manually via `gh workflow run deploy`).
2. Monitor: `gh run list --workflow=deploy.yml`
3. When complete, open the Pages URL from the Actions run output.
4. Confirm routing works (navigate to a deep route, refresh — should not 404 if hash strategy is used).

---

## Recovery

- **Build fails in CI but not locally**: check Node version mismatch — CI uses `20.x`, confirm local matches.
- **404 on page refresh**: hash strategy is not configured — apply Phase 3 Option A.
- **Blank page**: `base-href` is wrong — verify it matches `/<repo-name>/` exactly.
- **Permissions error in Actions**: ensure Pages is enabled in repo Settings → Pages → Source: GitHub Actions.
