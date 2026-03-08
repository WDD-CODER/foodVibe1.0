#!/usr/bin/env node
/**
 * Ensures every lucide-icon name used in src HTML templates is registered in app.config.ts.
 * Run: node scripts/check-lucide-icons.mjs
 * Exit 0 if all icons registered, 1 and list missing icons otherwise.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const SRC = join(process.cwd(), 'src');
const APP_CONFIG_PATH = join(SRC, 'app', 'app.config.ts');

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

function extractUsedIcons(htmlPath) {
  const content = readFileSync(htmlPath, 'utf8');
  const used = new Set();
  const re = /<lucide-icon\s[^>]*name=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) used.add(m[1].trim());
  return used;
}

function kebabToPascal(kebab) {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function getRegisteredIcons() {
  const content = readFileSync(APP_CONFIG_PATH, 'utf8');
  const registered = new Set();

  const mainImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-angular['"]/);
  if (mainImportMatch) {
    const names = mainImportMatch[1].split(',').map((s) => s.trim());
    for (const n of names) {
      if (n && n !== 'LucideAngularModule') registered.add(n);
    }
  }

  const srcIconsMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-angular\/src\/icons['"]/);
  if (srcIconsMatch) {
    const names = srcIconsMatch[1].split(',').map((s) => s.trim());
    for (const n of names) registered.add(n);
  }

  const pickMatch = content.match(/LucideAngularModule\.pick\s*\(\s*\{([^}]+)\}\s*\)/s);
  if (pickMatch) {
    const inner = pickMatch[1].replace(/\s/g, '');
    const names = inner.split(',').filter(Boolean).map((s) => s.trim());
    for (const n of names) registered.add(n);
  }

  return registered;
}

const allUsed = new Set();
for (const htmlPath of walkHtml(SRC)) {
  for (const name of extractUsedIcons(htmlPath)) {
    allUsed.add(name);
  }
}

const registered = getRegisteredIcons();
const missing = [];
for (const kebab of allUsed) {
  const pascal = kebabToPascal(kebab);
  if (!registered.has(pascal)) missing.push({ kebab, pascal });
}

if (missing.length === 0) {
  process.exit(0);
}

console.error('Lucide icons used in templates but not registered in app.config.ts:');
missing.forEach(({ kebab, pascal }) => {
  console.error(`  name="${kebab}" → add import ${pascal} and add to LucideAngularModule.pick({ ... })`);
});
process.exit(1);
