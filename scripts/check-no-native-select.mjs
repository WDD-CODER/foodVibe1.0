#!/usr/bin/env node
/**
 * Fails if any HTML template in src contains a native <select> element.
 * Use app-custom-select instead. Run: npm run lint:no-native-select
 * Exit 0 if none found, 1 and list files otherwise.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const SRC = join(process.cwd(), 'src');

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

const matches = [];
for (const htmlPath of walkHtml(SRC)) {
  const content = readFileSync(htmlPath, 'utf8');
  if (/<select[\s>]/i.test(content)) {
    matches.push(htmlPath);
  }
}

if (matches.length > 0) {
  console.error('Native <select> is not allowed. Use app-custom-select instead.');
  matches.forEach((p) => console.error('  ', p));
  process.exit(1);
}
