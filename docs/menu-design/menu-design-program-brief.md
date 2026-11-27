# Program Brief — Menu Design & WhatsApp Menu Assistant

Date: 2026-11-27
Author: Planner (claude.ai project "foodCo"), from a concept discussion with Dandan
Audience: the in-repo FoodVibe agent (Planner in the main folder) that turns briefs into Plan Contracts
Status: concept closed with Dandan. NOT verified against the repo — see "How to use this document".

---

## 1. How to use this document

This is a brief, not a Plan Contract. Do not execute it directly.

1. Sync to the latest `origin/main` first. Dandan was merging while this brief was written.
2. Nothing here was checked against the code. Every statement about existing features
   (menu intelligence, the agent-session console, the WhatsApp webhook, the dish-similarity
   mechanism, AI usage tracking, per-business modules) comes from Dandan's description.
   Locate each one in the repo and confirm how it works before planning. Where the code
   disagrees with this brief, the code wins — report the difference to Dandan, do not silently adapt.
3. Read `AGENTS.md`, `docs/brain/invariants.md`, `docs/brain/index.md` (decisions, gotchas),
   `docs/agent/standards-reuse.md` and `docs/brain/component-families.md` before planning.
4. Turn each brief (B1–B5) into one or more Plan Contracts in the `.claude/references/prd-template.md`
   format. Split anything larger than one Worker session.
5. Run the Reuse Check and the Adopt Check (section 6) for every new piece and every new
   runtime dependency. Show Dandan the candidates and wait for his decision before writing the plan that uses them.
6. Fill `## Architecture Impact` for every invariant a plan touches.
7. Collect all your questions for Dandan and ask them once, together, before planning starts.
8. Section 3 lists closed decisions. Do not reopen them. Items marked "(assumption)" are
   the Planner's defaults that Dandan has not explicitly confirmed — confirm them in your question round.

---

## 2. Product concept

A food business sends a customer a designed menu offer in seconds.

- The business designs the look of its menus once (fonts, colors, background, layout) in a designer, helped by AI.
- Every menu the business builds in menu intelligence is shown and edited in that design.
- Later, the owner sends a plain WhatsApp message listing dishes
  (for example: "fish carpaccio with tomato seeds, focaccia with spreads, beef bourguignon").
  The assistant builds a menu from it in the business's design and sends back a finished PDF,
  which the owner forwards to his customer.

The purpose is speed of offers: plain text in, a complete designed menu out.

---

## 3. Closed decisions

| # | Decision |
|---|---|
| D1 | n8n is not used. Everything runs on the existing Node server. |
| D2 | The feature lives in the FoodVibe repo as an add-on module of menu intelligence. A business without the module sees menu intelligence exactly as today. |
| D3 | The engine must stay usable by a customer who does not use the FoodVibe app. A standalone customer is a business record with only this module enabled, reached through WhatsApp, an API key, or a slim setup page. |
| D4 | The designer is a separate editor that sets the look only. It shows sample dishes so the user can judge fonts and layout. It is not where menus are written. |
| D5 | A business has several named designs, one of them the default. |
| D6 | Designs are created on a screen only in v1. No design creation by WhatsApp chat. |
| D7 | AI in the designer: the user gives a reference (picture, URL or text description) and gets three variants to choose from; then refines in plain words ("darker", "more elegant", "bigger dish names"). |
| D8 | The AI never writes free HTML or CSS. It only fills a fixed design schema and picks fonts from a curated list of Hebrew-capable fonts. |
| D9 | Background in v1: a color, a texture from a built-in set, or an image the user uploads. AI-generated backgrounds are deferred. |
| D10 | Menu content: sections (starters, mains, …) and dish names. The AI does the grouping into sections. No dish descriptions and no prices in v1. |
| D11 | Each menu carries an optional title, subtitle and bottom note. Business name, logo and contact line come from the design. |
| D12 | In menu intelligence the menu the user works on takes the selected design, and that designed view is the full editor where he types his dishes. A switcher changes between his designs. |
| D13 | Output is a PDF only in v1: one complete file, at natural size, never shrunk; a long menu continues on another page inside the same file. The customer must receive one complete thing — never two separate pictures. |
| D14 | An image output is deferred. Build the template so an image export can be added later without rework, but do not build it now. |
| D15 | Exports carry a small "Powered by FoodVibe" line by default, removable per business. |
| D16 | The latest export of each menu is kept. No export history. |
| D17 | Text direction follows the content, so Hebrew, English and mixed menus all render correctly. |
| D18 | WhatsApp senders: the owner, plus staff phones the owner approved. The business is identified from the sender's phone number. |
| D19 | On the shared development number, a registered business phone reaches this assistant; any other number goes to the customer-facing Front Desk flow. |
| D20 | Input by text or by voice note. The message may name a design and a title ("wedding design, for the Cohen family"). No design named means the default design. |
| D21 | No confirmation step. The assistant produces the menu immediately. |
| D22 | Dish matching uses the existing dish-similarity mechanism built for the AI add-menu feature. At 90% or above the dish becomes the catalog dish; below 90% the text stays exactly as the user wrote it. Unsynced dishes are fine — this is a showcase for the customer. |
| D23 | A WhatsApp message creates a real menu record in menu intelligence. The owner can open and keep editing it in the app. |
| D24 | The reply contains the PDF and one short line saying which dishes were linked to the catalog and which stayed as plain text. |
| D25 | The owner can correct by replying: replace, add or remove a dish, switch the design, change the title. The reply updates the same menu and a new PDF is sent. |
| D26 | The owner forwards the menu to his customer himself. The assistant never sends to end customers in v1. |
| D27 | WhatsApp goes through Meta's official Cloud API only. No unofficial WhatsApp-Web libraries. |
| D28 | Every AI call is tracked for usage and cost, as with all AI use in FoodVibe. |

Assumptions to confirm with Dandan:
- (assumption) PDF page size is A4 portrait, and a section is not split across pages when it can fit on the next one.
- (assumption) A correction by reply applies to the last menu that sender created through WhatsApp.
- (assumption) Uploaded backgrounds and logos use the existing image storage (Cloudinary).

---

## 4. Architecture guidelines

1. **One template, used everywhere.** The menu layout is a single HTML/CSS template driven by
   (design record + menu data). The same template draws the designer preview, the menu intelligence
   editor and the server-side PDF. What the user sees must equal what the customer receives.
2. **Engine boundary.** The design schema, the template, the export and the text-to-menu parser form
   an engine with a narrow contract: input = design + menu (title, subtitle, note, sections, dishes);
   output = PDF. The engine may depend on the rest of FoodVibe only through one small interface
   (resolve the business; record an AI call; store a file). Menu intelligence, WhatsApp and the
   public API are three callers of the same engine. This is what keeps D3 cheap.
3. **Design is a business asset**, not a WhatsApp feature and not a property of one menu. Menus reference a design.
4. **AI output is always schema-constrained** (D8). Validate it with the shared Zod schemas; an
   invalid AI answer falls back to the base template, never to a broken render.
5. **Module gating** follows the existing per-business modules mechanism. Verify what exists; do not invent a second one.
6. **No second WhatsApp entry path.** Extend the existing webhook and session console; do not add a parallel one.

---

## 5. Briefs

### B1 — Menu designs and the designer editor

**Goal:** a business can create, name, save and manage menu designs with AI help.

**Scope**
- Design record per business: fonts (title, section, dish), colors, background (color / built-in texture / uploaded image),
  logo, layout rules, fixed texts (business name, contact line), name, default flag.
- A small set of base templates the AI and the user start from.
- Designer screen: reference input (picture upload, URL, free text) → three AI variants → pick one →
  refine with form controls and with plain-words requests → save under a name.
- Live preview on sample dishes, drawn by the shared template (B2).
- List, rename, duplicate, delete, set default.
- Curated list of Hebrew-capable fonts.

**Notes**
- A URL reference means the server captures a screenshot and sends it down the same vision path as an uploaded picture.
- A reference gives style (palette, font character, mood, layout type). It does not reproduce the reference one to one. The UI should make that clear.
- Build the designer as a self-contained piece that menu intelligence hosts and that the standalone page (B5) can also host.

**Done when:** a user creates two named designs from two different references, refines one in plain words, sets a default, and both render correctly in the preview with Hebrew text.

### B2 — Shared menu template and PDF export

**Goal:** design + menu → one complete PDF, identical to the on-screen view.

**Scope**
- The shared HTML/CSS template (guideline 1).
- Server-side export to PDF under D13, D15, D16, D17.
- Export action callable from menu intelligence and from the engine API.
- Stored latest export per menu.

**Notes**
- The export approach is an Adopt Check item (section 6). The first-pass finding points to a headless
  browser because of Hebrew/RTL; verify memory and cold-start behavior on the Render plan in use.
- D14: keep the template independent of the output format.

**Done when:** a menu with Hebrew, English and mixed dish names exports to a PDF that matches the on-screen view; a menu too long for one page continues on a second page in the same file; the "Powered by FoodVibe" line appears and can be switched off for a business.

### B3 — Menu intelligence on the design

**Goal:** the menu the user works on in menu intelligence looks like his selected design and is edited there.

**Scope**
- Each menu references a design; new menus start with the business default.
- Design switcher on the menu.
- The designed view is the full editor (D12).
- Title, subtitle and bottom note fields (D11).
- Entry point to the designer (B1) from menu intelligence.
- Module gating (D2).

**Notes**
- **Size this first.** How large this is depends entirely on how the menu intelligence editor is built
  today. Before planning, read the current editor and report to Dandan: what can be restyled by the
  template, what has to be rebuilt, and how many plans it takes. If it is a rebuild, propose a staged
  path (for example: designed view with in-place text editing first, structural actions moved in later) and let him choose.
- Existing menus without a design must keep working.

**Done when:** a user with the module opens a menu, sees it in his default design, types dishes directly on it, switches to a second design and exports; a user without the module sees no change from today.

### B4 — WhatsApp menu assistant

**Goal:** a WhatsApp message with dishes produces a menu record and a PDF reply.

**Scope**
- Sender identification and routing (D18, D19), with owner-approved staff phones.
- Text and voice-note input (D20); extraction of dishes, optional design name and optional title.
- Grouping into sections by AI (D10).
- Matching through the existing similarity mechanism at the 90% threshold (D22).
- Menu creation in menu intelligence (D23) and export through B2.
- Reply (D24) and corrections by reply (D25), using the existing session console for conversation state.
- AI usage tracking (D28).

**Notes**
- Depends on B2, and on the menu-to-design reference from B3.
- A design name in the message that matches no design: use the default and say so in the reply.
- A message with no recognizable dishes: reply with a short example of the expected format; create nothing.
- All agent/system prompts are written in English, even though users write in Hebrew.

**Done when:** from a registered phone, a text message and a voice note each produce a saved menu and a PDF reply; a catalog dish at ≥90% is linked and a new dish stays as written; a reply "replace X with Y" updates the same menu and returns a new PDF; an unregistered number does not reach this assistant.

### B5 — Standalone access (can wait until B1–B4 work)

**Goal:** a customer who does not use the FoodVibe app can use the module.

**Scope**
- A business with only this module enabled.
- Public engine endpoint with a per-business API key: menu data + design name in, PDF out.
- A slim setup page hosting the designer (B1) and phone registration.

**Done when:** a module-only business sets up a design on the slim page and gets a PDF both by WhatsApp and by an API call, without ever opening the FoodVibe app.

---

## 6. Order, parallelism, and open-source first pass

**Order:** B1 and B2 first — they can run in parallel once the design schema and the template
contract are agreed (plan that contract as the first sub-task of both). Then B3. Then B4. B5 last.
Recommend to Dandan which plans can run under separate orchestrators at the same time.

**Open-source first pass (2026-11-27 — a first look, not a completed Adopt Check; verify versions, license, maintenance, downloads and compatibility with `package.json`):**

| Piece | Finding | Direction to evaluate |
|---|---|---|
| Menu → PDF | Satori is ruled out: its README lists RTL languages as unsupported, and the Arabic/Hebrew fix is still an open pull request (vercel/satori #745). | Headless Chromium (Puppeteer or Playwright) rendering the shared HTML template. |
| Design editor | Polotno (Canva-like SDK) is commercial. GrapesJS is BSD-licensed but is a web-page builder, heavier than needed. | Probably `build`: base templates plus a settings form and live preview. Confirm in the Adopt Check. |
| WhatsApp connection | Evolution API is Apache 2.0, but its Baileys connector breaks WhatsApp's terms and risks a number ban. | Meta's official Cloud API (D27), as already planned for Front Desk. |

Sources: https://github.com/vercel/satori/ · https://github.akers.workers.dev/vercel/satori/pull/745 · https://polotno.com/canva-alternative · https://sourceforge.net/projects/grapesjs.mirror/ · https://raw.githubusercontent.com/evolution-foundation/evolution-api/main/README.md · https://pasqualepillitteri.it/en/news/12969/integrate-whatsapp-evolution-api-vs-cloud-api

---

## 7. Out of scope / parked

- Image (picture) output for WhatsApp — deferred (D14).
- AI-generated backgrounds.
- Dish descriptions and prices on the menu.
- Design creation by WhatsApp chat.
- Sending directly to end customers; attaching WhatsApp-created menus to a CRM client or event.
- Running the module on a customer's own infrastructure (the engine boundary keeps this possible later).
