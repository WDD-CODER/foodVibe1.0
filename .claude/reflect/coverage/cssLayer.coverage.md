# Coverage Map: cssLayer
Generated: 2026-04-03 | Score: 100.0 | Commit: 04cbdf8

## SKILL.md Rules → Test Coverage

| Line | Rule (truncated to 60 chars) | Covered by | Status |
|------|------------------------------|------------|--------|
| 9 | Trigger: Before creating/editing .scss/.css in src/ | TC-005 B1 | ✓ |
| 12 | .c-* engine classes belong only in src/styles.scss | TC-001 B5, TC-002 B1 | ✓ |
| 13 | Angular view encapsulation scopes .c-* in components | TC-002 B4 | ✓ |
| 14 | If .c-* found in component → move to src/styles.scss | TC-002 B2, TC-002 B3 | ✓ |
| 15 | No inline styles unless value is dynamic/runtime | TC-001 AP4, TC-008 B1, TC-008 B2 | ✓ |
| 16 | Logical properties only: margin-inline, padding-block | TC-001 B4, TC-006 B1, TC-006 B2 | ✓ |
| 17 | Responsive breakpoints must follow project token defs | TC-009 B1 | ✓ |
| 23 | Engine Search: Scan src/styles.scss before writing | TC-001 B1, TC-007 B1 | ✓ |
| 25 | Component Scan: Check .scss files for .c-* defs | TC-002 B1 | ✓ |
| 27 | Shared UI Check: Scan src/app/shared/ | TC-001 B2 | ✓ |
| 33 | Five-Group Vertical Rhythm, blank line between groups | TC-001 B3, TC-003 B6, TC-008 B3 | ✓ |
| 35 | Layout — display, flex, grid, position, gap, z-index | TC-003 B1, TC-010 B1 | ✓ |
| 36 | Dimensions — width, height, aspect-ratio | TC-003 B2, TC-008 B1, TC-010 B4 | ✓ |
| 37 | Content — typography, colors, content | TC-003 B3, TC-008 B2 | ✓ |
| 38 | Structure — margin, padding, border, border-radius | TC-003 B4, TC-006 B4 | ✓ |
| 39 | Effects — transition, animation, shadow, opacity | TC-003 B5, TC-010 B2, TC-010 B3 | ✓ |
| 41 | Place responsive blocks after base selector | TC-009 B2 | ✓ |
| 47 | Only invoke Phase 3 if repeated across >2 components | TC-004 B1 | ✓ |
| 49 | Abstraction: name/define/register .c-* + replace | TC-004 B2, TC-004 B3, TC-004 B4 | ✓ |

**Untested rules**: none — all rules covered by at least one TC

## Tests → SKILL.md Coverage

| TC | Behavior | SKILL.md line | Status |
|----|----------|---------------|--------|
| TC-001 B1 | Scans src/styles.scss before writing | line 23 | ✓ |
| TC-001 B2 | Checks src/app/shared/ | line 27 | ✓ |
| TC-001 B3 | Five-Group Rhythm applied | line 33 | ✓ |
| TC-001 B4 | Uses logical properties | line 16 | ✓ |
| TC-001 B5 | No .c-* in component file | line 12 | ✓ |
| TC-002 B1 | Identifies .c-* violation | line 12 | ✓ |
| TC-002 B2 | Moves to src/styles.scss | line 14 | ✓ |
| TC-002 B3 | Removes from component | line 14 | ✓ |
| TC-002 B4 | Explains Angular encapsulation | line 13 | ✓ |
| TC-003 B1 | display/gap/z-index → Layout | line 35 | ✓ |
| TC-003 B2 | width → Dimensions | line 36 | ✓ |
| TC-003 B3 | color → Content | line 37 | ✓ |
| TC-003 B4 | border-radius/padding-block → Structure | line 38 | ✓ |
| TC-003 B5 | transition/animation → Effects | line 39 | ✓ |
| TC-003 B6 | Exactly one blank line between groups | line 33 | ✓ |
| TC-004 B1 | Recognizes Phase 3 trigger (3 components) | line 47 | ✓ |
| TC-004 B2 | Proposes .c-* in src/styles.scss | line 49 | ✓ |
| TC-004 B3 | Names, defines, registers class | line 49 | ✓ |
| TC-004 B4 | Replaces in all three component files | line 49 | ✓ |
| TC-005 B1 | Skill does NOT activate for .ts file | line 9 | ✓ |
| TC-005 B2 | No CSS guidance given | line 9 | ✓ |
| TC-005 B3 | Response focuses on TypeScript | line 9 | ✓ |
| TC-006 B1 | Uses padding-inline for horizontal spacing | line 16 | ✓ |
| TC-006 B2 | Uses padding-block-start for top spacing | line 16 | ✓ |
| TC-006 B3 | Uses padding-block-end or omits for bottom | line 16 | ✓ |
| TC-006 B4 | Places border in Group 4 (Structure) | line 38 | ✓ |
| TC-007 B1 | Scans src/styles.scss before writing | line 23 | ✓ |
| TC-007 B2 | Composes found engine class instead of rewriting | line 23 | ✓ |
| TC-007 B3 | Writes new styles with Five-Group if none found | line 33 | ✓ |
| TC-007 B4 | No .c-* in component regardless of outcome | line 12 | ✓ |
| TC-008 B1 | height → SCSS Group 2, not inline | lines 15, 36 | ✓ |
| TC-008 B2 | background-color → SCSS Group 3, not inline | lines 15, 37 | ✓ |
| TC-008 B3 | Five-Group Rhythm with h→G2, bg-color→G3 | line 33 | ✓ |
| TC-009 B1 | Uses token breakpoints, not hardcoded px values | line 17 | ✓ |
| TC-009 B2 | Breakpoint blocks placed after base selector | line 41 | ✓ |
| TC-009 B3 | Five-Group Rhythm inside responsive block | line 33 | ✓ |
| TC-010 B1 | z-index → Group 1 (Layout) | line 35 | ✓ |
| TC-010 B2 | opacity → Group 5 (Effects) | line 39 | ✓ |
| TC-010 B3 | transition → Group 5 (Effects) | line 39 | ✓ |
| TC-010 B4 | width/height → Group 2 (Dimensions) | line 36 | ✓ |

**Broken tests**: none — all 40 behaviors map to a specific SKILL.md line
