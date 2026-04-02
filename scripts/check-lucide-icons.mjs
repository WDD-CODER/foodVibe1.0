#!/usr/bin/env node
/**
 * Fails if any <lucide-icon name="..."> in HTML templates references an icon
 * not registered in LucideAngularModule.pick() in app.config.ts.
 * Run: npm run lint:icons
 * Exit 0 if all icons registered, 1 with list of violations otherwise.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const SRC = join(process.cwd(), 'src');
const APP_CONFIG = join(SRC, 'app', 'app.config.ts');

// Convert PascalCase Lucide identifier to kebab-case icon name.
// e.g. Trash2 -> trash-2, CookingPot -> cooking-pot, RotateCcw -> rotate-ccw
function toKebab(name) {
  return name
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Za-z])/g, '$1-$2')
    .toLowerCase();
}

// Parse app.config.ts — extract all identifiers inside LucideAngularModule.pick({...})
function getRegisteredIcons(configPath) {
  const content = readFileSync(configPath, 'utf8');
  const match = content.match(/LucideAngularModule\.pick\(\{([\s\S]*?)\}\)/);
  if (!match) {
    console.error('ERROR: Could not find LucideAngularModule.pick({...}) in app.config.ts');
    process.exit(1);
  }
  const block = match[1];
  const identifiers = [...block.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1]);
  return new Set(identifiers.map(toKebab));
}

// Walk .html files recursively under dir
function* walkHtml(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') {
      yield* walkHtml(full);
    } else if (e.isFile() && extname(e.name).toLowerCase() === '.html') {
      yield full;
    }
  }
}

// Extract icon name strings from a template file.
// Handles:
//   <lucide-icon name="icon-name">          static
//   <lucide-icon [name]="'icon-name'">      bound string literal
//   <lucide-icon [name]="a ? 'x' : 'y'">   ternary — both branches extracted
// Skips: [name]="someVariable" — cannot be checked statically.
function extractIconNames(content) {
  const names = new Set();
  // Find each <lucide-icon ...> tag (including multiline attributes)
  const tagPattern = /<lucide-icon\b([\s\S]*?)(?:\/>|>)/g;
  for (const tagMatch of content.matchAll(tagPattern)) {
    const attrs = tagMatch[1];
    // Static: name="value"
    const staticMatch = attrs.match(/\bname="([^"]+)"/);
    if (staticMatch) {
      names.add(staticMatch[1]);
    }
    // Dynamic: [name]="..." — extract icon strings from the expression.
    // Only picks up ternary branches (after ? and after :) and bare string literals.
    // Deliberately skips string literals that appear as function call arguments
    // (e.g. isCategoryExpanded('Date') ? 'a' : 'b' — 'Date' is not an icon name).
    const dynMatch = attrs.match(/\[name\]="([^"]+)"/);
    if (dynMatch) {
      const expr = dynMatch[1].trim();
      // Bare quoted string: [name]="'icon-name'"
      const bareMatch = expr.match(/^'([^']+)'$/);
      if (bareMatch) {
        names.add(bareMatch[1]);
      }
      // Ternary result branches: condition ? 'icon-a' : 'icon-b'
      // Only extract the two string literals that immediately follow ? and :
      const ternaryMatch = expr.match(/\?\s*'([^']+)'\s*:\s*'([^']+)'/);
      if (ternaryMatch) {
        names.add(ternaryMatch[1]);
        names.add(ternaryMatch[2]);
      }
    }
  }
  return names;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const registered = getRegisteredIcons(APP_CONFIG);
const violations = []; // { file, icon }

for (const htmlPath of walkHtml(SRC)) {
  const content = readFileSync(htmlPath, 'utf8');
  if (!content.includes('lucide-icon')) continue;
  const used = extractIconNames(content);
  for (const icon of used) {
    if (!registered.has(icon)) {
      violations.push({ file: htmlPath, icon });
    }
  }
}

if (violations.length > 0) {
  console.error(
    'Unregistered Lucide icons found. Add them to LucideAngularModule.pick() in app.config.ts.\n'
  );
  for (const { file, icon } of violations) {
    console.error(`  "${icon}"  →  ${file}`);
  }
  process.exit(1);
}

console.log(`✓ All Lucide icons registered (${registered.size} icons in pick, 0 violations).`);
