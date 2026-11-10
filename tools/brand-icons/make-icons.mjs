import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, '.interface-design/source/assets/fc-favicon.svg'), 'utf8');

// Art B: rounded, as designed (favicon).
const artB = src;
// Art A: full square, pot scaled into the maskable safe zone.
const artA = src
  .replace('rx="14"', 'rx="0"')
  .replace('<g mask="url(#fc-fav-cut)">', '<g transform="translate(32 32) scale(0.78) translate(-32 -32)"><g mask="url(#fc-fav-cut)">')
  .replace(/<\/g>\s*<\/svg>\s*$/, '</g></g></svg>');
if (artA === src || !artA.includes('rx="0"') || !artA.includes('scale(0.78)')) throw new Error('Art A transform failed');

const html = (svg) => `<body style="margin:0">${svg.replace('width="64" height="64"', 'width="100%" height="100%"')}</body>`;

const browser = await chromium.launch(process.env.BRAND_ICONS_CHROMIUM ? { executablePath: process.env.BRAND_ICONS_CHROMIUM } : {});
async function render(svg, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(html(svg));
  const buf = await page.screenshot({ type: 'png', omitBackground: true });
  await page.close();
  return buf;
}

let count = 0;
for (const n of [72, 96, 128, 144, 152, 192, 384, 512]) {
  writeFileSync(join(root, `public/icons/icon-${n}x${n}.png`), await render(artA, n));
  count++;
}
writeFileSync(join(root, 'public/icons/apple-touch-icon.png'), await render(artA, 180));
count++;

const sizes = [32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await render(artB, s));
await browser.close();
const header = Buffer.from([0, 0, 1, 0, sizes.length, 0]);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s; e[1] = s; e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(join(root, 'public/favicon.ico'), Buffer.concat([header, ...entries, ...pngs]));
count++;
console.log(`BRAND_ICONS: wrote ${count} files`);
