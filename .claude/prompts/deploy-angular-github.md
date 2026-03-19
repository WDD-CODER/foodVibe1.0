---
name: deployAngularToGitHub
description: Configure this Angular SPA for deployment to GitHub Pages
argument-hint: Repository name for base-href (e.g. foodVibe1.0)
---
Help me deploy this foodVibe1.0 Angular application to GitHub Pages. Follow these standards:

1. **Build configuration**: Use the correct `--base-href` for GitHub Pages (e.g. `/foodVibe1.0/` for repo name `foodVibe1.0`).
2. **Routing**: Prefer Hash location strategy for GitHub Pages to avoid 404s on refresh, or ensure the server is configured for SPA fallback.
3. **GitHub Actions**: Use `.github/workflows/deploy.yml` that:
   - Uses Node.js 20.x.
   - Runs `npm ci` and `npm run build` at project root.
   - Uploads the artifact from `dist/food-vibe1.0/browser`.
   - Deploys to the `github-pages` environment.
4. **Secrets**: Do not commit API keys or secrets; use GitHub Secrets and reference them in the workflow if needed.
5. **Validation**: Run a production build (`npm run build`) before deployment to catch strict type errors.
