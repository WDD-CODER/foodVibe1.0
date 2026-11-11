// Plan 572: fails when a Pass theme token is lost or a typed colour returns to the paper files.
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const fails = [];
const styles = read('src/styles.scss');
const must = [
  '--color-primary: #0f766e;', '--color-primary-hover: #115e59;', '--color-lamp: #f59e0b;',
  '--color-lamp: #fbbf24;', "--font-guest: 'Frank Ruhl Libre', 'Heebo', serif;", '--paper-sheet: #fdfdfa;',
  '.c-num {', '.c-pass-line {', '--color-primary: #2dd4bf;', '--color-primary-glow: rgba(20, 184, 166, 0.25);',
];
for (const m of must) if (!styles.includes(m)) fails.push(`src/styles.scss missing: ${m}`);
if (styles.includes('--color-primary: #14b8a6;')) fails.push('src/styles.scss still has --color-primary: #14b8a6;');
const dir = 'src/app/pages/menu-intelligence/';
for (const f of ['_paper-ui.scss', '_toolbar.scss']) {
  const hit = read(dir + f).match(/#[0-9a-fA-F]{3,8}\b/);
  if (hit) fails.push(`${dir}${f} has a typed colour: ${hit[0]}`);
}
const n = read(dir + '_paper-ui.scss').split('var(--font-guest)').length - 1;
if (n !== 2) fails.push(`_paper-ui.scss var(--font-guest) count is ${n}, expected 2`);
if (!read('src/index.html').includes('Frank+Ruhl+Libre')) fails.push('src/index.html missing Frank+Ruhl+Libre');
if (!styles.includes(':root.theme-kitchen .brand-mark img {')) fails.push('src/styles.scss missing the kitchen brand mark rule');
for (const m of ['--bg-body: #e6eeee;', '--bg-glass: #ffffff;', '--bg-glass-strong: #ffffff;', '--radius-lg: 1.5rem;', '--bg-bar: rgba(13, 92, 86, 0.92);', '/* ---- Depth theme (plan 577): status dot ----', '--bg-body: #0a1614;', '--radius-chip: 0.625rem;']) {
  if (!styles.includes(m)) fails.push(`src/styles.scss missing: ${m}`);
}
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
console.log('THEME_TOKENS: ok');
