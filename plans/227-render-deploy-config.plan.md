---
name: 227-render-deploy-config
overview: Add render.yaml so Render deploys the Express server from server/ with correct env var references.
todos: []
isProject: false
---

# Goal
Add render.yaml to the repo root so Render can deploy the foodVibe backend without manual dashboard config.

# Atomic Sub-tasks
- [ ] `render.yaml` — create at repo root with web service config (rootDir: server, MONGO_REMOTE_URI, JWT_SECRET, ALLOWED_ORIGIN)
- [ ] `angular.json` — verify outputPath matches `dist/food-vibe1.0/browser` in server/index.js

# Rules
- MONGO_REMOTE_URI, JWT_SECRET, ALLOWED_ORIGIN must use `sync: false` — no literal values in yaml
- rootDir: server is mandatory — Render installs from server/package.json
- Do not touch .env or any other file beyond render.yaml

# Done when
- render.yaml exists at repo root
- User confirms Render dashboard shows the service as Live
