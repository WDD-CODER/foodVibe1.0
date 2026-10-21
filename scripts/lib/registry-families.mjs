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
    hint: 'use app-custom-select (src/app/shared/custom-select/) instead of a hand-built input + dropdown shell'
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
    id: 'page-list-logic',
    family: 'list-logic',
    files: ['src/app/pages/**/*.ts'],
    exclude: ['**/*.spec.ts'],
    pattern: /^\s*(?:(?:public|private|protected|readonly)\s+)*(?:onClearSearch|onSearchEscape|clearAllFilters)\s*(?:\(|=)/,
    hint: 'list search / clear logic is a shared family (list-logic) — reuse it, do not add another page copy'
  }
]
