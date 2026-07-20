<!-- ADR-0004 gate, reviewed 2026-07-20: strengthened -->
# Pattern: Gemini backend-proxy

## Problem

Calling Gemini directly from the client would require shipping an API key in browser-visible code — an instant secret leak. The named trap: putting the key in `environment.ts` / `environment.prod.ts` (or importing `@google/generative-ai` under `src/app/**`) because Angular "environment" files feel like server config — they are still bundled to the browser.

## Solution

All Gemini calls route through `server/routes/ai.js`. The client never holds a Gemini key; it calls FoodVibe's own backend endpoint, which holds the key server-side (from `.env`) and proxies the request.

## When to use

Any new AI-powered feature (recipe generation, menu generation/patch, product AI, etc.) must add its endpoint to `server/routes/ai.js` rather than calling Gemini from `src/app/**`. This is a hard rule in `AGENTS.md`, not just a convention — see that file for the exact wording. Do **not** use this pattern as permission to stash the key in client env placeholders "just for local" — `.env` on the server only. This pattern file records the "why" (key-leak + environment.ts near-miss), not the implementation checklist.
