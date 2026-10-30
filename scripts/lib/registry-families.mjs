/**
 * Reuse-lint rules as data (plan 450). Each rule names a family from docs/brain/component-families.md
 * (its `### <family>` heading) and the added lines that look like a new copy of it.
 * Plans 451–458 add one entry per family they converge; `reuse-lint --check-registry` fails when a
 * rule's family has no heading in the registry.
 *
 * Rule shape:
 *   id        short stable id, printed in the warning
 *   family    registry heading id (`### <family> — …`)
 *   files     picomatch globs the changed file must match
 *   exclude   picomatch globs that skip a file (optional)
 *   pattern   RegExp tested against each added line
 *   skip      RegExp: an added line that matches is ignored (optional)
 *   hint      what to use instead (one line)
 */
export const REUSE_RULES = [
  {
    id: 'page-local-combobox',
    family: 'search-combobox',
    files: ['src/app/pages/**/*.html', 'src/app/pages/**/*.ts'],
    pattern: /<app-(?:scrollable-dropdown|add-option-row)\b/,
    hint: 'use app-search-combobox (src/app/shared/search-combobox/) instead of a hand-built input + dropdown shell'
  },
  {
    id: 'engine-class-outside-styles',
    family: 'engine-classes',
    files: ['src/**/*.scss', 'src/**/*.css'],
    exclude: ['src/styles.scss'],
    pattern: /^\s*\.c-[a-z][\w-]*[^;]*[{,]\s*$/,
    skip: /^\s*\/\//,
    hint: '.c-* engine classes are defined only in src/styles.scss — use the engine, or add it there'
  },
  {
    id: 'relative-core-import',
    family: 'helpers',
    files: ['src/**/*.ts'],
    pattern: /from\s+['"](?:\.\.?\/)+(?:[\w.-]+\/)*core\/(?:utils|pipes|services)\//,
    hint: 'import through the alias: @utils/*, @pipes/*, @services/*'
  },
  {
    id: 'hand-drawn-modal-overlay',
    family: 'modal-shell',
    files: ['src/app/**/*.html'],
    exclude: ['src/app/shared/modal-shell/**'],
    pattern: /class="[^"]*bc-modal-overlay/,
    hint: 'wrap the popup in app-modal-shell (src/app/shared/modal-shell/) instead of drawing .c-modal-overlay by hand'
  },
  {
    id: 'page-list-logic',
    family: 'list-logic',
    files: ['src/app/pages/**/*.ts'],
    exclude: ['**/*.spec.ts'],
    pattern: /^\s*(?:(?:public|private|protected|readonly)\s+)*(?:onClearSearch|onSearchEscape|clearAllFilters)\s*(?:\(|=)/,
    hint: 'list search / clear logic is a shared family (list-logic) — reuse it, do not add another page copy'
  },
  {
    id: 'native-browser-dialog',
    family: 'modal-shell',
    files: ['src/app/**/*.ts'],
    exclude: ['**/*.spec.ts'],
    pattern: /(?:\bwindow\.|(?<![.\w$]))(?:confirm|alert|prompt)\s*\(/,
    skip: /^\s*(?:\/\/|\*|\/\*)|^\s*(?:(?:public|private|protected|readonly|async|static)\s+)*(?:confirm|alert|prompt)\s*\([^)]*\)\s*(?::[^{]+)?\{/,
    hint: 'ask through ConfirmModalService (or app-modal-shell) — never the browser confirm / alert / prompt'
  },
  {
    id: 'number-input-outside-number-box',
    family: 'number-box',
    files: ['src/app/**/*.html'],
    pattern: /type="number"/,
    skip: /appNumberBox/,
    hint: 'wrap a new number input in a box with appNumberBox (src/app/core/directives/number-box.directive.ts) so a tap anywhere on the box edits the number'
  },
  {
    id: 'minus-plus-outside-stepper',
    family: 'stepper',
    files: ['src/app/**/*.html'],
    pattern: /\((?:click|mousedown|pointerdown)\)="[^"]*(?:increment|decrement|startHold|startGuestHold|step\w*(?:Amount|Value|Qty|Count))\w*\(/i,
    skip: /appStepHold/,
    hint: 'a minus / plus button next to a number takes appStepHold (src/app/shared/counter/step-hold.directive.ts) or app-counter, so hold-to-repeat, steps and the minimum are the same everywhere'
  },
  {
    id: 'native-date-input',
    family: 'form-field',
    files: ['src/app/**/*.html'],
    exclude: ['src/app/shared/date-field/**'],
    pattern: /type="date"/,
    hint: 'a date is picked with app-date-field (src/app/shared/date-field/) so every screen shows and types dd/mm/yyyy'
  },
  {
    id: 'template-to-fixed',
    family: 'helpers',
    files: ['src/app/**/*.html'],
    pattern: /\.toFixed\(/,
    hint: 'show numbers through core/engine/rounding.ts (formatPct1, formatPctInt, formatMoney) or the formatQuantity pipe, not toFixed in a template'
  }
]
