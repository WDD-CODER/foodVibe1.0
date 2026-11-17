// The inventory must match the code: `node scripts/inventory.mjs --check` as a diff check.
// Skipped with a note when the project has no inventory file. Settings come from scripts/inventory.mjs; a kit-checks
// `--config` JSON may lay an "inventory" object over them (tests).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkInventory, inventoryConfig, STALE } from '../../inventory.mjs'

export const id = 'inventory-fresh'

export function run(ctx) {
  const config = inventoryConfig(ctx.config?.inventory ?? {})
  if (!existsSync(join(ctx.root, config.path))) {
    ctx.note(`inventory-fresh skipped — no ${config.path}`)
    return []
  }
  const r = checkInventory(ctx.root, ctx.config?.inventory ?? {})
  return r.ok ? [] : [{ rule: 'inventory-stale', file: config.path, line: 1, hint: STALE }]
}
