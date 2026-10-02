/**
 * Kit extractor — lands every `tier: core` file from docs/workflow-kit/manifest.json
 * into the kit repo under `core/`. See
 * plans/329-workflow-kit-extraction-phase-2-core-scaffold.plan.md (B3, B6).
 *
 * Usage:
 *   node scripts/kit-extract.mjs [--kit <dir>] [--force]   # write files (skips existing unless --force)
 *   node scripts/kit-extract.mjs [--kit <dir>] --check     # coverage report, writes nothing
 *
 * Actions: copy = byte-identical (after repairing double-encoded UTF-8, see MOJIBAKE); parameterize = placeholder substitution driven by
 * each entry's params[].key; split = same mechanical pass, then the generic half is
 * hand-fixed in the kit repo (B4). Node built-ins only. Exit 0 = ok, 1 = problems.
 * Never writes inside this repo.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flagValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : null
}
const repoRoot = resolve(join(__dirname, '..'))
const kitRoot = resolve(flagValue('--kit') ?? join(repoRoot, '..', 'ai-workflow-kit'))
const force = argv.includes('--force')
const checkOnly = argv.includes('--check')
const manifest = JSON.parse(readFileSync(join(repoRoot, 'docs/workflow-kit/manifest.json'), 'utf8'))
const core = manifest.entries.filter((e) => e.tier === 'core')

// Core files whose kit copy is hand-fixed in B4, so byte-identity is not expected.
const HAND_FIXED = new Set([
  '.claude/commands/feat.md', '.claude/commands/fix.md', '.claude/commands/ship.md',
  'docs/agent/ship-regular.md', 'scripts/brain-capture-comment.mjs', 'docs/agent/job-validation.md',
  'README_WORKFLOW.md', 'scripts/kit-manifest-check.mjs', 'docs/agent/brain-capture.md',
])

// FoodVibe sources contain double-encoded UTF-8 (a UTF-8 dash read as cp1252); the kit ships the repaired text.
const MOJIBAKE = [['â€”', '—'], ['â€“', '–'], ['â†’', '→'], ['â†‘', '↑'], ['â†“', '↓'], ['â€˜', '‘'], ['â€™', '’'], ['â€œ', '“'], ['â€¦', '…'], ['â€¢', '•']]
MOJIBAKE.push(['âœ“', '✓'], ['Ã—', '×'], ['â‰¥', '≥'], ['â‰¤', '≤'])
const fixEncoding = (text) => MOJIBAKE.reduce((s, [bad, good]) => s.split(bad).join(good), text)

const ph = (key) => `{{${key}}}`
const npmRun = (key) => `npm run ${ph(key)}`

// Substitution rules per config key; applied only to files whose manifest entry records that key.
// Longer / more specific patterns come first inside each list.
const RULES = {
  'hooks.shellPath': [[/C:[\\/]+Program Files[\\/]+Git[\\/]+bin[\\/]+bash\.exe/gi, ph('hooks.shellPath')], [/C:[\\/]+Program Files[\\/]+Git/gi, ph('hooks.shellPath')]],
  'hooks.projectRoot': [[/C:[\\/]+coding projects[\\/]+Cursor[\\/]+foodVibe1\.0/gi, ph('hooks.projectRoot')], [/C:[\\/]+coding projects/gi, ph('hooks.projectRoot')]],
  'hooks.userHome': [[/C:[\\/]+Users[\\/]+danwe/gi, ph('hooks.userHome')]],
  'project.name': [
    [/foodvibe_wt(?:\$\{n\}|\{N\}|N)/gi, ph('slots.dbNameFormat')],
    [/foodvibe[-_]db[-_]backups/gi, `${ph('project.name')}-db-backups`],
    [/foodVibe\s*1\.0/gi, ph('project.name')],
    [/foodvibe/gi, ph('project.name')],
  ],
  'slots.dbNameFormat': [[/foodvibe_wt(?:\$\{n\}|\{N\}|N)/gi, ph('slots.dbNameFormat')]],
  'slots.folderSuffix': [[/(\{\{project\.name\}\})-wt-(?:\d|N)\b/g, `$1${ph('slots.folderSuffix')}`]],
  'slots.count': [[/\bwt-1\.\.3\b/g, `${ph('slots.nameFormat')} (1..${ph('slots.count')})`]],
  'slots.nameFormat': [[/\bwt-(?:N|[1-3])\b/g, ph('slots.nameFormat')]],
  'slots.fePorts': [[/\b420N\b/g, `${ph('slots.fePorts')}+N`], [/\b4200\b/g, ph('slots.fePorts')], [/\b420([1-3])\b/g, `${ph('slots.fePorts')}+$1`]],
  'slots.bePorts': [[/\b300N\b/g, `${ph('slots.bePorts')}+N`], [/\b3000\b/g, ph('slots.bePorts')], [/\b300([1-3])\b/g, `${ph('slots.bePorts')}+$1`]],
  'git.mainBranch': [[/origin\/main\b/g, `origin/${ph('git.mainBranch')}`], [/refs\/heads\/main\b/g, `refs/heads/${ph('git.mainBranch')}`], [/(['"])main\1/g, `$1${ph('git.mainBranch')}$1`]],
  'commands.build': [[/(?:npx )?ng build\b(?: --configuration=\w+)?/g, npmRun('commands.build')]],
  'commands.lint': [[/(?:npx )?ng lint\b/g, npmRun('commands.lint')], [/npm run lint\b/g, npmRun('commands.lint')]],
  'commands.test': [[/(?:npx )?ng test\b(?: --watch=false)?(?: --browsers=\w+)?/g, npmRun('commands.test')]],
  'commands.dev': [[/ng serve\b/g, npmRun('commands.dev')]],
  'commands.devLocal': [[/npm run dev:local\b/g, npmRun('commands.devLocal')]],
  'commands.dbBackup': [[/server\/scripts\/db-(?:backup|restore)\.js/g, ph('commands.dbBackup')]],
  'paths.slotEnvFile': [[/ng serve -c slot\b/g, npmRun('commands.devLocal')], [/src\/environments\/environment\.slot\.ts/g, ph('paths.slotEnvFile')]],
  'paths.hotspots': [
    [/`?src\/styles\.scss`?(?:,\s*| and |\s*\/\s*)`?(?:public\/assets\/data\/)?dictionary\.json`?(?:,\s*| and |\s*\/\s*)`?(?:src\/app\/)?app\.routes\.ts`?/g, '`' + ph('paths.hotspots') + '`'],
    [/src\/styles\.scss/g, ph('paths.hotspots')],
    [/(?:src\/app\/)?app\.routes\.ts/g, ph('paths.hotspots')],
  ],
  'project.i18nFile': [[/(?:public\/assets\/data\/)?dictionary\.json/g, ph('project.i18nFile')]],
  'paths.srcRoot': [[/src\/app\//g, ph('paths.srcRoot')]],
  'paths.serverRoot': [[/(^|[^\w/.-])server\/(?=[\w.*])/g, `$1${ph('paths.serverRoot')}`], [/(^|[^\w/.-])server\/(?![\w.*])/g, `$1${ph('paths.serverRoot')}`]],
  'stack.name': [[/angular(?: \d+)?/gi, ph('stack.name')]],
  'stack.backend': [[/\bExpress\b/g, ph('stack.backend')], [/\bMongo(?:DB|ose)?\b/g, ph('stack.backend')]],
  'stack.stylesheetExt': [[/\bscss\b/gi, ph('stack.stylesheetExt')]],
  'deploy.host': [[/\bRender\b/g, ph('deploy.host')]],
  'deploy.dbHost': [[/\bAtlas\b/g, ph('deploy.dbHost')]],
  'tools.browser': [[/gstack(?:\s*`?\/browse`?)?/gi, ph('tools.browser')], [/`?\/browse`?\b/g, ph('tools.browser')]],
}

// Order matters: path-shaped keys before name-shaped ones so a path is consumed whole.
const KEY_ORDER = [
  'hooks.shellPath', 'hooks.projectRoot', 'hooks.userHome', 'commands.dbBackup', 'paths.slotEnvFile',
  'paths.hotspots', 'project.i18nFile', 'project.name', 'slots.dbNameFormat', 'slots.folderSuffix',
  'slots.count', 'slots.nameFormat', 'slots.fePorts', 'slots.bePorts', 'git.mainBranch',
  'commands.build', 'commands.lint', 'commands.test', 'commands.devLocal', 'commands.dev',
  'paths.srcRoot', 'paths.serverRoot', 'stack.name', 'stack.backend', 'stack.stylesheetExt',
  'deploy.host', 'deploy.dbHost', 'tools.browser',
]

function parameterize(text, params) {
  const keys = new Set(params.map((p) => p.key))
  // project.name drags the slot folder/db rules along even when only it is recorded.
  if (keys.has('project.name')) { keys.add('slots.folderSuffix'); keys.add('slots.dbNameFormat') }
  let out = text
  for (const key of KEY_ORDER) {
    if (!keys.has(key)) continue
    for (const [re, to] of RULES[key]) out = out.replace(re, to)
  }
  // Array literals that became `'{{k}}', '{{k}}'` collapse to one.
  out = out.replace(/(['"])(\{\{[\w.]+\}\})\1(?:,\s*\1\2\1)+/g, '$1$2$1')
  return out
}

const problems = []
let landed = 0
let unhandled = 0
let written = 0

for (const e of core) {
  const src = join(repoRoot, e.path)
  const dest = join(kitRoot, 'core', e.path)
  if (!['copy', 'parameterize', 'split'].includes(e.action)) {
    unhandled++
    problems.push(`unhandled-action "${e.action}": ${e.path}`)
    continue
  }
  if (!checkOnly) {
    if (!existsSync(src)) { problems.push(`missing-source: ${e.path}`); continue }
    if (force || !existsSync(dest)) {
      const text = readFileSync(src, 'utf8')
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, fixEncoding(e.action === 'copy' ? text : parameterize(text, e.params)), 'utf8')
      written++
    }
  }
  if (!existsSync(dest)) { problems.push(`missing: core/${e.path}`); continue }
  if (e.action === 'copy' && !HAND_FIXED.has(e.path) && existsSync(src) && fixEncoding(readFileSync(src, 'utf8')) !== readFileSync(dest, 'utf8')) {
    problems.push(`copy-not-identical: core/${e.path}`)
    continue
  }
  landed++
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  console.error(`KIT_EXTRACT: FAIL — ${landed}/${core.length} core files landed, ${core.length - landed - unhandled} missing, ${unhandled} unhandled-action (${problems.length} problems)`)
  process.exit(1)
}
console.log(`KIT_EXTRACT: ok — ${landed}/${core.length} core files landed, 0 missing, 0 unhandled-action${checkOnly ? '' : ` (${written} written)`}`)
