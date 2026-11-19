/**
 * Reuse-lint rules as data. Each rule names a family from the registry (its `### <family>` heading in
 * paths.reuseRegistry) and the added lines that look like a new copy of it. `node scripts/reuse-lint.mjs
 * --check-registry` fails when a rule's family has no heading. A copy that already exists is debt in the baseline
 * (`reuse-copy.<family>`): it never blocks; a new one does.
 *
 * Rule shape:
 *   id        short stable id, printed in the finding
 *   family    registry heading id
 *   files     picomatch globs the changed file must match
 *   exclude   picomatch globs that skip a file (optional)
 *   pattern   RegExp tested against each line
 *   skip      RegExp: a line that matches is ignored (optional)
 *   hint      what to use instead (one line)
 */
export const REUSE_RULES = []
