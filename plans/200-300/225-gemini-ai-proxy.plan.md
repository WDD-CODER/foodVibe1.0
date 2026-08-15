---
name: Gemini AI Proxy — Key Off Client
overview: Move Gemini API key from client localStorage to server process.env; all AI generation calls proxied through Express so the key never reaches the browser.
todos:
  - "[ ] server/routes/ai.js — create POST /generate behind verifyToken"
  - "[ ] server/index.js — mount aiRouter at /api/v1/ai"
  - "[ ] .env — add GEMINI_API_KEY= placeholder"
  - "[ ] gemini.service.ts — remove apiKey_ signal + localStorage; HttpClient proxy"
  - "[ ] ai-recipe-modal.component.ts — remove key config state + method"
  - "[ ] ai-recipe-modal.component.html — remove key config UI blocks"
  - "[ ] ng build — zero errors"
isProject: false
---

# Gemini AI Proxy — Key Off Client

## Goal

Move the Gemini API key from `localStorage` (client-exposed, exfiltration risk) to `process.env.GEMINI_API_KEY` on the Express server. All AI recipe generation calls are proxied through `POST /api/v1/ai/generate`. The key never reaches the browser.

## Atomic Sub-tasks

- [ ] `server/routes/ai.js` — create new route: POST /generate behind verifyToken, reads GEMINI_API_KEY from process.env, forwards { prompt } to Gemini, returns { recipe } or error
- [ ] `server/index.js` — require ai route file, mount at /api/v1/ai (after auth routes, before static)
- [ ] `.env` — add `GEMINI_API_KEY=` placeholder line (actual key filled by operator)
- [ ] `gemini.service.ts` — remove apiKey_ signal, setApiKey(), localStorage.getItem/setItem; inject HttpClient; generateRecipe(prompt) posts to ${authBase}/api/v1/ai/generate, returns AiRecipeDraft from response.recipe
- [ ] `ai-recipe-modal.component.ts` — remove configuring_, keyInput_, onSaveKey(); remove geminiService from protected if no longer needed in template
- [ ] `ai-recipe-modal.component.html` — remove initial key-config guard block and inline configure gear section; prompt panel is always shown when modal is open
- [ ] `ng build` — verify zero errors before commit

## Constraints

- verifyToken required on /api/v1/ai/generate — no unauthenticated Gemini calls (quota protection)
- GEMINI_API_KEY only in process.env — never in source, never sent to client
- Use environment.authApiUrl as base URL for the proxy call (same Express server)
- No any casts; single quotes in TS; no semicolons
- inject() for DI — no constructor injection

## Verification

- ng build passes with zero errors
- Network tab: no outbound calls to generativelanguage.googleapis.com — only POST /api/v1/ai/generate
- localStorage contains no FV_GEMINI_API_KEY key
- Key config UI removed from AI recipe modal
- Unauthenticated POST /api/v1/ai/generate → 401
