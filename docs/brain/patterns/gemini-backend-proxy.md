# Pattern: Gemini backend-proxy

## Problem

Calling Gemini directly from the client would require shipping an API key in browser-visible code — an instant secret leak.

## Solution

All Gemini calls route through `server/routes/ai.js`. The client never holds a Gemini key; it calls FoodVibe's own backend endpoint, which holds the key server-side (from `.env`) and proxies the request.

## When to use

Any new AI-powered feature (recipe generation, menu generation/patch, product AI, etc.) must add its endpoint to `server/routes/ai.js` rather than calling Gemini from `src/app/**`. This is a hard rule in `AGENTS.md`, not just a convention — see that file for the exact wording. This pattern file records the "why" (key-leak prevention), not the implementation checklist.
