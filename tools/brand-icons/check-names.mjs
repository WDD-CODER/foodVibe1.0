import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const re = /FoodVibe|Food Composer|foodVibe1\.0/;
const fails = [];

function scan(rel) {
  const lines = readFileSync(join(root, rel), 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => { if (re.test(l)) fails.push(`${rel}:${i + 1}: old product name`); });
}
function walk(dir, out) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

for (const f of ['src/index.html', 'public/manifest.webmanifest', 'public/assets/style/img/fc-mark.svg', 'public/assets/data/dictionary.json']) scan(f);
for (const p of walk(join(root, 'src/app'), [])) scan(p.slice(root.length + 1).replaceAll('\\', '/'));

if (!readFileSync(join(root, 'src/index.html'), 'utf8').includes('<title>foodCo</title>')) fails.push('src/index.html: title is not foodCo');
if (JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8')).name !== 'foodCo') fails.push('public/manifest.webmanifest: name is not foodCo');

if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
console.log('BRAND_NAMES: ok');
