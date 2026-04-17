/**
 * Removes trailing semicolons from TypeScript source files.
 * Targets only `;\s*$` (semicolon at end of line).
 *
 * Safe because:
 *  - for(;;) semicolons are never at end-of-line
 *  - mid-line semicolons (for conditions) are not matched by `;\s*$`
 *
 * Excluded (bootstrap files where semicolons may be tooling-required):
 *  - src/main.ts
 *  - src/app/app.config.ts
 *  - src/app/app.routes.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = resolve('src/app')
const EXCLUDED = new Set([
  resolve('src/main.ts'),
  resolve('src/app/app.config.ts'),
  resolve('src/app/app.routes.ts'),
])

let filesChanged = 0
let totalRemoved = 0

function walkTs(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkTs(full)
    } else if (entry.endsWith('.ts') && !EXCLUDED.has(resolve(full))) {
      processFile(full)
    }
  }
}

// ASI danger characters: lines starting with these can merge with the previous
// statement if the preceding semicolon is removed.
const ASI_DANGER = /^\s*[([`]/

function processFile(filePath) {
  const original = readFileSync(filePath, 'utf8')
  const lines = original.split(/\r?\n/)
  let removed = 0

  const result = lines.map((line, i) => {
    // Only consider lines that end with `;` (optionally followed by whitespace)
    if (!/;\s*$/.test(line)) return line

    // If the next meaningful line (skipping blanks AND single-line comments)
    // starts with `(`, `[`, or `` ` ``, removing this semicolon would cause an
    // ASI parse error — keep it.
    const nextLine = lines.slice(i + 1).find(l => {
      const t = l.trim()
      return t.length > 0 && !t.startsWith('//')
    })
    if (nextLine && ASI_DANGER.test(nextLine)) return line

    removed++
    return line.replace(/;\s*$/, '')
  })

  const updated = result.join(original.includes('\r\n') ? '\r\n' : '\n')

  if (updated !== original) {
    writeFileSync(filePath, updated, 'utf8')
    filesChanged++
    totalRemoved += removed
    console.log(`  ${filePath.replace(resolve('.') + '/', '')} — ${removed} removed`)
  }
}

console.log('Removing trailing semicolons from src/app/**/*.ts …\n')
walkTs(ROOT)
console.log(`\nDone. ${totalRemoved} semicolons removed across ${filesChanged} files.`)
