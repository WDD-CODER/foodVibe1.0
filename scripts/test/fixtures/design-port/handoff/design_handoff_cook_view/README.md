# Handoff: Cook View refactor (foodVibe1.0)

## Overview
Test fixture shaped like the real Cook View handoff (plan 404). Start with `PROMPT.md`.

## Mapping to the codebase
| Design piece | Repo file(s) |
|---|---|
| Page layout, panes, step cards | `src/app/pages/cook-view/cook-view.page.html` / `.scss` / `.ts` |
| Header (dark-mode contrast) | `core/components/header/header.component.scss` |
| Sub-nav chips | `core/components/tab-chips` (no logic change) |
| Unit expander on ingredient rows | new small shared component (suggest `app-unit-expander`) |
| Tokens | `src/styles.scss` `:root` |

## Breakpoints
| Name | Range |
|---|---|
| Phone | ≤620 |
| Desktop | ≥1024 |

## Read this first: reality check against the current code
### Behaviour that already exists and must be preserved
- Login gates on edit and approve.
