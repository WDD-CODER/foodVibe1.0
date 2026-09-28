# foodVibe Backend — Free-Tier Deployment Plan

> **Superseded topology note (2026-09-27):** this doc describes an early split setup (separate
> `foodvibe-api` service with `Root Directory: server`, frontend built/updated separately). The
> live deploy now uses `render.yaml` at the repo root: a single combined service
> (`foodvibe1-0-1-frankfurt`, Frankfurt region) that builds the Angular app and serves it
> same-origin alongside the API (`npm run build:render` / `node server/index.js`). Hostnames below
> are corrected to the current service, but treat the build/start-command and "Root Directory"
> steps in Section 2 as historical, not something to follow verbatim — see `render.yaml` for the
> actual current build/start commands.

## Overview

| Service | Provider | Plan | Cost |
|---------|----------|------|------|
| Database | MongoDB Atlas | M0 (512 MB) | Free |
| API server | Render.com | Web Service (512 MB RAM) | Free |
| Frontend | GitHub Pages (existing) | — | Free |

---

## 1. MongoDB Atlas Setup

1. Create account at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a new **Project** → create a **Cluster** → choose **M0 Free Tier** (AWS, region closest to Render data center).
3. Database Access → Add Database User: username + strong password (save these).
4. Network Access → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) — Render IPs are dynamic.
5. Connect → Drivers → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/foodvibe?retryWrites=true&w=majority
   ```
6. This becomes the `MONGO_URI` environment variable on Render.

> **Capacity note:** M0 gives 512 MB storage. A kitchen with 6 users, ~500 products, ~200 recipes, ~100 dishes and full activity logs will use well under 50 MB of BSON. Users can attach base64-encoded profile images; at 6 users this adds <1 MB total but the field should be migrated to an external image URL (e.g. Cloudinary free tier) if the user base grows past ~20.

---

## 2. Render.com Setup

1. Create account at [render.com](https://render.com).
2. New → **Web Service** → connect GitHub repo (`WDD-CODER/foodVibe1.0`).
3. Configure the service:
   - **Name:** `foodvibe1-0-1-frankfurt` (current; historically `foodvibe-api`/`foodvibe`)
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `node index.js`
   - **Instance type:** Free
4. Add Environment Variables (Settings → Environment):

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | Atlas connection string from step 1 |
   | `JWT_SECRET` | Random 48-byte hex: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `ALLOWED_ORIGIN` | `https://wdd-coder.github.io` (or your GitHub Pages URL) |
   | `NODE_ENV` | `production` |

5. Deploy → wait for green "Live" status.
6. Copy the service URL (currently `https://foodvibe1-0-1-frankfurt.onrender.com`).

### Cold-start caveat
The Render free tier spins down after 15 minutes of inactivity. The first request after sleep takes ~30 s. This is acceptable for the current user base (6 users). If it becomes annoying, a free uptime-monitor ping (e.g. UptimeRobot, 5-minute interval) keeps the service warm.

---

## 3. Angular Frontend Update

1. Open `src/environments/environment.prod.ts`.
2. Replace `your-render-url.onrender.com` with the actual Render service URL:
   ```typescript
   apiUrl: 'https://foodvibe1-0-1-frankfurt.onrender.com',
   authApiUrl: 'https://foodvibe1-0-1-frankfurt.onrender.com',
   ```
3. Build and deploy:
   ```bash
   npm run build -- --configuration production
   ```
   The existing GitHub Actions workflow (`.claude/workflows/deploy.yml`) deploys on every push to `main` automatically.

---

## 4. Post-Deploy Smoke Tests

- `GET https://foodvibe1-0-1-frankfurt.onrender.com/api/health` → `{ "ok": true }`
- `POST /api/auth/signup` with valid body → `{ token, user }`
- `POST /api/auth/login` with same credentials → `{ token, user }`
- `POST /api/data/PRODUCT_LIST` with `Authorization: Bearer <token>` → `201`
- `GET /api/data/PRODUCT_LIST` → returns array

---

## 5. Security Checklist (pre-deploy)

- [ ] `JWT_SECRET` is a random 48+ byte value — not a word or phrase
- [ ] `ALLOWED_ORIGIN` is the exact GitHub Pages URL — not `*`
- [ ] `MONGO_URI` is only in Render env vars — not in any committed file
- [ ] `server/.env` is in `.gitignore` (use `server/.env.example` as reference only)
- [ ] Atlas M0 user has **read/write** on `foodvibe` DB only — not `atlasAdmin`
- [ ] Run `cd server && npm audit --audit-level=high` — zero high/critical vulnerabilities before deploy
