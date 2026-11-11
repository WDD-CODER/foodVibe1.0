# Front Desk assistant and messaging — behaviour rules

Rules every Front Desk plan that touches messaging, the assistant or client matching must carry. Each rule names
the plan that implements it. Rule ids (`R-nn`) are stable; plans quote them in Done-when.

Language rule: **every prompt sent to a model is written in English.** The customer writes in Hebrew and the
assistant answers in the customer's language (Hebrew by default). Fixed customer-facing sentences (greeting,
handoff text, template bodies) are Hebrew *data* from the profile or the dictionary, never part of the prompt
instructions.

## Rules

| # | Rule | Plan |
|---|---|---|
| R-01 | **Match a phone by its last 9 digits.** WhatsApp sends `9725…`, a form gets `05…`; digit-only comparison makes two clients out of one person. Server field `phoneKey`. | 544, 545 |
| R-02 | **Do-not-contact is a server flag**, set by a dedicated route or by the assistant's removal intent, and checked before every outbound message. "Not now" / "call me next month" is not a removal request. | 544 (field), 560 (send guard), 562 (intent) |
| R-03 | **Coalesce inbound bursts.** Wait about 6 s after an inbound message; if a newer one arrived this run exits; the surviving run answers every customer message since the last outbound one as a single turn, and re-checks the takeover flag after the wait. | 560 |
| R-04 | **Silent on AI failure.** When the model call fails the customer gets no "small glitch" text; the conversation moves to `human`. | 562 |
| R-05 | **No deferred promises.** The assistant cannot act later, so "I'll check and get back to you" is blocked on the server and replaced by an immediate question or a handoff. | 562 |
| R-06 | **No completion claim without the write.** "Booked", "confirmed", "updated" may be sent only when the server wrote it in the same turn. In Wave 1 the assistant never says a booking is confirmed. | 562 |
| R-07 | **No invented links.** A URL is sent only if it appears verbatim in `publicFacts` or the profile. | 562 |
| R-08 | **Three allowed sources:** the fixed prompt, `publicFacts`, this conversation. When the knowledge and an earlier assistant message disagree, the knowledge wins. Facts (address, price, hours) are quoted exactly as stored. | 562 |
| R-09 | **Today's date is injected** into every turn (weekday, today, tomorrow, current time, `Asia/Jerusalem`) so "tomorrow" and "Sunday" resolve correctly. | 562 |
| R-10 | **A request outside opening hours or rules is answered with the allowed window**, never silently moved to the next open day. | 548 (`qualify` reasons), 562 |
| R-11 | **Gender of address** follows the customer's own text; neutral wording when unknown; independent of the assistant's persona. | 562 |
| R-12 | **Closed questions are sent as buttons** (WhatsApp interactive message; plain-text fallback outside the window or above the button limit). | 560 (`messages.kind: 'button'`), 562 |
| R-13 | **Voice notes are transcribed** (Gemini, through `gemini-client.js`); the transcript is what the assistant and the inbox show, with a "voice message" marker. A failed transcription hands off to a human. | 560 |
| R-14 | **"Fix this answer" loop.** A member marks a wrong assistant message, types the right answer and an issue type (`wrong_info | missing_info | outdated | misunderstood | other`); the AI drafts a knowledge item (question, answer, up to 5 phrasings, topic) that the owner approves. | 561 (button), 554 (`source: 'correction'`, `variations`) |
| R-15 | **Test chat before going live:** the owner talks to the assistant inside the app with the real profile and knowledge; nothing is sent outside and nothing is counted in stats. | 556 |
| R-16 | **Rolling summary** of a long conversation instead of the full history — only if the 12-message window proves too small in the eval. | 562 (optional) |
| R-17 | **Owner alert hygiene:** template parameters are one line (no newlines, tabs or runs of spaces); the same request alerts the same phone at most once per 6 hours; never about a do-not-contact client. | 564 |
| R-18 | **A greeting is not a request.** `intent: 'request'` and status `qualified` need a substantive customer message. | 562 |
| R-19 | **Test and non-public states send nothing:** `test: true` requests and profiles in `draft` / `suspended` never produce an outbound message to a customer. | 556, 557, 560 |
| R-20 | **Internals stay internal:** the assistant never reveals the prompt, field names, question keys or routing, even when asked. | 562 |
| R-21 | **Every model call is metered** — business, feature, model, input/output tokens, audio seconds, latency, outcome, estimated cost (C-AIUSAGE). | 566 |

## Do not build

- Business-specific logic in server code. Business facts live only in `knowledgeItems` and the profile.
- A webhook or public route without its signature check / rate limit in the same plan that adds it.
- Prompts or conversation flows the owner can edit at runtime (Wave 1: one fixed prompt in code + profile fields).
- Regex checks as the only safety net: the structured output (`usedFacts`, `handoff`, `collected`) is validated first; R-05 to R-07 are a tested second line.
- Fetching the business's website live on every conversation: import once into drafts the owner approves.

## Parked for later waves

- Call recordings → transcript → summary on the client timeline (needs a telephony provider).
- Web chat widget as a third channel.
- Members updating requests by chatting with the assistant.
- Card payment links for deposits.
