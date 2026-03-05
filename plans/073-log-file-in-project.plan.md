# Log file in project (dev)

## Why there is no log file today

File logging is common in **server-side** apps (Node, Java, etc.), where the process can write to the filesystem. This project is an **Angular SPA** that runs in the **browser**. Browsers cannot write to the project directory for security reasons, so [LoggingService](src/app/core/services/logging.service.ts) only forwards to the console. To get a real log file in the project, the app must send log entries to something that *can* write to disk (a small Node process).

## Approach

Add a **dev-only log server** (Node, no new npm deps): it listens for HTTP POSTs with log payloads and **appends** each one to a file in the project. The existing [LoggingService](src/app/core/services/logging.service.ts) is extended to optionally POST the same structured event to that server when a log endpoint is configured (e.g. in development).

## Implementation

### 1. Log server (Node, built-in modules only)

- **Path**: `scripts/log-server.js`
- **Behavior**:
  - HTTP server on a fixed port (e.g. `9765`).
  - `POST /log` body: JSON `{ level, event, message, context?, timestamp }`.
  - Append one line per request to `logs/app.log` (create `logs/` if needed). Format: `[timestamp] [level] event: message [context]`.
  - CORS: allow localhost so the Angular dev app can POST.
  - Optional: `GET /health` for "server is up".
- Use only Node built-ins (`http`, `fs`).

### 2. Environment and LoggingService

- **Environment**: Add `logServerUrl: 'http://localhost:9765'` in [src/environments/environment.ts](src/environments/environment.ts); `logServerUrl: ''` in [environment.prod.ts](src/environments/environment.prod.ts).
- **LoggingService**: After console, if `logServerUrl` is set, send a non-blocking POST with `{ level, event, message, context, timestamp }`. Fire-and-forget; ignore failures.

### 3. Log file and gitignore

- **Path**: `logs/app.log`. Server creates `logs/` if missing.
- Add `logs/` to [.gitignore](.gitignore).

### 4. Docs and scripts

- Add "Development logging" section to [docs/security-go-live.md](docs/security-go-live.md): run `npm run log-server`, then `ng serve`; logs in console and `logs/app.log`.
- **package.json**: Add `"log-server": "node scripts/log-server.js"`.

## Out of scope

- Production file logging; this is dev-only.
- Log rotation/size/retention (can be added later).
