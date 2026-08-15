---
name: 230-mongo-uri-env-split
overview: Unify MongoDB connection to a single MONGO_URI env var — local .env points to Compass, Render dashboard points to Atlas.
todos: []
isProject: false
---

# Goal
Make localhost:4200 use local MongoDB (Compass) and Render use MongoDB Atlas, controlled entirely by MONGO_URI in each environment's .env.

# Atomic Sub-tasks
- [ ] `server/db.js` — rewrite to read single MONGO_URI (remove NODE_ENV branch, remove MONGO_LOCAL_URI/MONGO_REMOTE_URI refs)
- [ ] `server/.env` — replace MONGO_LOCAL_URI/MONGO_REMOTE_URI with MONGO_URI=localhost, add PORT=3000, ALLOWED_ORIGIN=http://localhost:4200
- [ ] Secrets audit — confirm server/.env was never committed to git history

# Verified No-op (brief said change, reality already correct)
- `src/environments/environment.ts` — already has correct values; no change needed
- `src/environments/environment.prod.ts` — empty apiUrl/authApiUrl is correct for same-origin Render; no change needed
- `.gitignore` — .env pattern already present; no change needed

# Rules
- Never commit server/.env
- MONGO_URI value is the sole differentiator between local and Atlas
- dotenv resolves from CWD (server/) — confirmed correct

# Done when
- npm run dev in server/ → "MongoDB connected" pointing at localhost:27017
- ng serve → data shows in Compass under foodvibe DB
- Render deployment → server connects to Atlas (MONGO_URI set in Render dashboard manually)
