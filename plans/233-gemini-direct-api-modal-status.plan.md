---
name: Gemini Direct API + Modal Status Feedback
overview: Rewrite GeminiService to call Gemini API directly via fetch with localStorage key management, and update AiRecipeModalComponent with API key config flow and generation status feedback.
todos: []
isProject: false
---

# Goal
Replace the backend-proxied GeminiService with a direct fetch-based client, add API key management (localStorage FV_GEMINI_API_KEY), and give the user visible status feedback (sending → done/error) in the AI recipe modal.

# Architecture Note (2026-04-19)
Direct fetch + localStorage API key approach was **dropped**. Architecture pivoted to backend proxy — Gemini API key lives server-side in the Node.js backend. Only the modal status feedback portion was implemented.

# Atomic Sub-tasks
- [DROPPED] `gemini.service.ts` — fetch-based direct API, apiKey_ signal, hasKey, setApiKey() — backend proxy kept instead
- [DROPPED] `ai-recipe-modal.component.ts` — configuringKey_/keyInput_ signals, onSaveKey, API key guard — no client-side key management
- [DROPPED] `ai-recipe-modal.component.html` — key config panel
- [x] `ai-recipe-modal.component.ts` — status_ signal (idle/sending/done/error), onClose, status bar wired
- [x] `ng build` — zero errors

# Rules
- Do NOT use HttpClient for GeminiService — use fetch only
- API key stored in localStorage under FV_GEMINI_API_KEY only, never in source files
- status_ states: 'idle' | 'sending' | 'done' | 'error'
- No new .c-* engine classes in component SCSS
- No any, single quotes in TS, double quotes in HTML, no semicolons

# Done when
- GeminiService uses fetch to call generativelanguage.googleapis.com directly
- Modal shows key config panel when no key is set
- Status bar shows "שולח..." / "תשובה התקבלה" / error message
- ng build passes with zero errors
