# Refactor recipe-header SCSS: remove duplicate metrics-notice rules

## Why the duplicates are safe to remove

- **Template structure** ([recipe-header.component.html](src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html)): The only use of `.metrics-notice-item` is inside `.metrics-notice-floating` (line 154). There is no `.metrics-notice-heading` in the template.
- **DOM path**: `.metrics-square` → `.metric-group-weight-volume` → … → `.metrics-notice-floating` → … → `.metrics-notice-item`. So the only rules that ever apply are those under `.metrics-notice-floating` (`.metrics-square .metrics-notice-floating .metrics-notice-item`). The second block (`.metrics-square .metrics-notice-heading` and `.metrics-square .metrics-notice-item`) is redundant: same properties, and the nested block already covers the only DOM that exists.
- **Outcome**: Removing the second block does not change which elements are styled or how they look.

## Change to make

**File:** [recipe-header.component.scss](src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss)

- **Delete** the duplicate block at lines 244–259 (the blank line after `.metrics-notice-floating`'s closing `}`, then the two selectors `.metrics-notice-heading` and `.metrics-notice-item` that are direct children of `.metrics-square`, and their identical rule bodies).
- **Keep** the block inside `.metrics-notice-floating` (lines 229–243: `.metrics-notice-heading` and `.metrics-notice-item` nested under `.metrics-notice-floating`).
- **Optional:** Shorten or update the comment on line 228 (it refers to `app-floating-info-container`, which is not in the current template). For example: "Style heading and items for the floating metrics notice content."

## Verification

- No template or TypeScript changes.
- After the edit, run the app and open the recipe-builder header; trigger the metrics notice (alert icon / unconvertible items). The floating list and item text should look unchanged.
- Optional: run any existing SCSS/build or e2e tests that cover the recipe header.

## Compliance

- [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md): No new selectors or tokens; only removal of duplicate rules. Remaining rules already use `var(--...)` and rem; no change to encapsulation or Tailwind usage.
