---
name: Gemini Direct API + Modal Status Feedback
overview: Rewrite GeminiService to call Gemini API directly via fetch with localStorage key management, and update AiRecipeModalComponent with API key config flow and generation status feedback.
todos: []
isProject: false
---

# Goal
Replace the backend-proxied GeminiService with a direct fetch-based client, add API key management (localStorage FV_GEMINI_API_KEY), and give the user visible status feedback (sending → done/error) in the AI recipe modal.

# Atomic Sub-tasks
- [ ] `gemini.service.ts` — rewrite: fetch-based direct Gemini API call, apiKey_ signal, hasKey computed, setApiKey(), remove HttpClient/dead imports
- [ ] `ai-recipe-modal.component.ts` — add configuringKey_/keyInput_/status_ signals, onSaveKey/onClose methods, API key guard in onGenerate(), FormsModule in imports
- [ ] `ai-recipe-modal.component.html` — add key config panel (shown when no key) + status bar (sending/done/error states)
- [ ] `ng build` — verify zero errors

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
