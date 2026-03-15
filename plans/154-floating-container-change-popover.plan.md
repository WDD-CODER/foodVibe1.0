# Floating container and change-popover refactor

## 1. Current state and usage

**Where "floating" / arrow-scroll behavior exists today**

| Location | Behavior | Styling |
|----------|----------|---------|
| dashboard-overview | Activity list: vertical scroll with scrollIndicators + scroll zones + chevron-up/down; change tags: horizontal scroll with left/right .activity-scroll-btn. Change popover: fixed div, glass card, single line from ← to. | .change-popover-fixed / .change-popover in component SCSS |
| recipe-header | Metrics notice (warning icon): absolute .metrics-notice-floating, list with scrollIndicators + scroll zones + chevron-up/down; scrollbar hidden. | Component SCSS |
| scrollable-dropdown | Vertical list with scrollIndicators; scroll zones + chevron-up/down. | Engine in styles.scss (.c-dropdown, etc.) |

**Change-log data**: ActivityEntry (id, action, entityType, entityId, entityName, timestamp, details?, changes[]); ActivityChange (field, label, from?, to?). Translation keys for activity_created/updated/deleted and activity_field_*.

**Gap**: Popover shows only from ← to; field label commented out; no entity name, action, or time.

## 2. Target architecture

- **FloatingInfoContainer**: Reusable presentational component. Fixed/absolute position, Liquid Glass styling, optional vertical overflow with arrows (scroll indicators + scroll zones + chevrons). Content via ng-content.
- **ChangePopover**: Dedicated component using FloatingInfoContainer. Receives activity + change; renders field label, from→to, optional entity/action/time. Emits close on click-outside.
- **Dashboard**: Keeps open state; replaces inline popover with app-change-popover.
- **Recipe-header metrics-notice**: Refactored to use FloatingInfoContainer.

## 3. Implementation plan

### 3.1 FloatingInfoContainer (src/app/shared/floating-info-container/)
- Inputs: position (top/left or anchor), scrollAxis: 'vertical' | 'horizontal' | 'none' (default 'vertical'), optional maxHeight/maxWidth.
- When scrollAxis === 'vertical': wrap content in scrollable div with scrollIndicators, scroll zones, chevron-up/down (same pattern as .c-dropdown).
- Styling: cssLayer; existing tokens (--bg-glass-strong, --border-glass, --shadow-card, --radius-md, --blur-glass). Five-group order.
- Import ScrollIndicatorsDirective.

### 3.2 ChangePopover (src/app/shared/change-popover/)
- Inputs: open (top, left, activityId, field) | null; activity: ActivityEntry | undefined. Output: closeRequest.
- Use FloatingInfoContainer with scrollAxis 'none'. Content: field label (translatePipe), from → to (formatChangeValue); optional line: entity name + action (activity_created/updated/deleted).
- Move formatChangeValue from dashboard into component (or pipe). ClickOutSideDirective to emit closeRequest.

### 3.3 Dashboard integration
- Replace inline change-popover-fixed div with app-change-popover. Keep openChange_, getOpenActivity, getChange, closeChangePopoverOnOutsideClick, toggleChangePopover. Remove .change-popover-fixed, .change-popover and related from dashboard SCSS.

### 3.4 Recipe-header metrics-notice
- Replace .metrics-notice-floating block with FloatingInfoContainer (scrollAxis vertical, maxHeight ~11.25rem). Position via wrapper or container input. Remove duplicate scroll-zone/scroll-indicator styles from recipe-header SCSS.

### 3.5 Styling and testing
- Apply cssLayer for all new/edited SCSS. Verify dashboard popover open/close and recipe-header metrics notice scroll with arrows.

## 4. Files to add
- src/app/shared/floating-info-container/*.ts|html|scss
- src/app/shared/change-popover/*.ts|html|scss

## 5. Files to modify
- dashboard-overview.component.html|ts|scss
- recipe-header.component.html|ts|scss
