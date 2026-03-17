# SCSS global tokens audit and refactor

## Scope

All `.scss` under `src/app/`; designated global file: `src/styles.scss`. Three-tier: Global (2+ files → :root) / Component-scoped (3+ in one file → :host) / No token (1–2 uses → literal).

## Part A: Global tokens in src/styles.scss

Surfaces: --bg-pure, --bg-subtle, --bg-muted, --border-default, --border-strong. Text: --color-text-main, --color-text-secondary, --color-text-muted, --color-text-muted-light, --color-text-slate-600. Semantic: --color-success, --bg-success, --text-success; --color-primary, --color-primary-hover, --bg-primary-subtle; --bg-warning, --text-warning, --border-warning; --color-danger, --bg-danger-subtle. Menu: --font-serif, --color-ink, --color-ink-muted, --color-frame, --color-ornament, --border-warm, --bg-paper, --bg-paper-alt, --bg-page-menu. Radii: --radius-thin, --radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-full. Shadows: --shadow-card, --shadow-modal, --shadow-focus. Other: --overlay-backdrop, --break-sm, --break-md.

## Part B–D: Per-file use global tokens; component-scoped only for 3+ in file; literal for 1–2. Naming per Part D.

## Execution order

1. Extend styles.scss :root. 2. menu-library-list (pilot). 3. menu-intelligence. 4. Modals then pages then core. 5. cook-view (replace only cv-* that map to global).
