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
| R-03 | **Coalesce inbound bursts.** Wait about 6 s after an inbound message; if a newer one arrived this run exits; the surviving run answers every customer message since the last outbound one as a single turn, and re-checks the takeover flag after the wait. Superseded in part by R-26 and R-27 (plan 753): a message that arrives while a run works starts no second run, and the takeover re-check also runs after the model call. | 560 |
| R-04 | **Silent on AI failure.** When the model call fails the customer gets no "small glitch" text; the conversation moves to `human`. Superseded in part by R-22 (plan 733): a technical failure now sends one holding message. | 562 |
| R-05 | **No deferred promises.** The assistant cannot act later, so "I'll check and get back to you" is blocked on the server and replaced by an immediate question or a handoff. | 562 |
| R-06 | **No completion claim without the write.** "Booked", "confirmed", "updated" may be sent only when the server wrote it in the same turn. A table is confirmed only by the engine and the hold (INV-7). | 562 |
| R-07 | **No invented links.** A URL is sent only if it appears verbatim in `publicFacts` or the profile. | 562 |
| R-08 | **Three allowed sources:** the fixed prompt, `publicFacts`, this conversation. When the knowledge and an earlier assistant message disagree, the knowledge wins. Facts (address, price, hours) are quoted exactly as stored. | 562 |
| R-09 | **Today's date is injected** into every turn (weekday, today, tomorrow, current time, `Asia/Jerusalem`) so "tomorrow" and "Sunday" resolve correctly. Superseded in part by R-24 (plan 751): the server no longer relies on the model for this. | 562 |
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
| R-22 | **One holding message on a technical failure.** When the model call or the daily cap fails the turn (`assistantFailed` busy / timeout / quota / other), the guest gets the business's handoff text, else `fd_ai_holding_default`, once until the guest writes again; the conversation still moves to `human`. Not at level 0 for a real guest; guardrail blocks are unchanged. | 733 |
| R-23 | **The simulator answers as level 1.** A test conversation is answered as at level 1 whatever the business's level, unless a member holds it; real guests keep the level. | 733 |
| R-24 | **Date words are resolved by the server.** When a `book`, `change` or `request` answer has no valid `YYYY-MM-DD` date, the server resolves the model's own value, and for `book` and `request` else the guest's current message(s) — the ones since the last outbound message, at most 30 minutes old — for היום, הערב, הלילה, מחר, מחרתיים, a weekday name or a day/month date, in `Asia/Jerusalem`. A weekday means the next such day after today. Two different dates resolve to nothing. A valid date of the model always wins. | 751 |
| R-25 | **A time in a reply must stand in the facts.** With table service on, every `H:mm` of a reply that is sent must equal, as `HH:mm`, a time in any fact line sent to the model or the open / close of the profile's hours; else the reply is blocked (`unsupported_time`) and a person answers. The model's `usedFacts` list no longer decides this. | 680, 751 |
| R-26 | **One assistant run per conversation.** A run takes a lease on the conversation (`run`, 90 s, ends by itself). A guest message that arrives while the lease is live starts no run and is noted on it; when the run ends and a noted message was not read by it, one follow-up run answers the unanswered guest messages together (the 5 newest), linked to the first by `followsRunId`; at most 3 follow-ups in a row, then a person. The first run's answer is sent, except when it was about to write a request or change or cancel a table: then it writes and sends nothing and the follow-up answers everything. Button taps take no lease. | 753 |
| R-27 | **A person who steps in stops the run.** Take over and a member's reply remove the lease; after the model call and before its first write the run reads the conversation again and, when the status is not `bot` or the lease is not its own, sends nothing and writes nothing (run `dropped`), and no follow-up starts. | 753 |
| R-28 | **Every unanswered guest message is answered.** The prompt tells the model to answer, in one reply and in order, every guest message at the end of the conversation that has no assistant message after it; with two or more the data block UNANSWERED gives their number (at most 5). | 753 |

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
