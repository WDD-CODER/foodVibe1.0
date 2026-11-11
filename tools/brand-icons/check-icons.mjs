import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const oldMd5 = {
  'public/favicon.ico': '05bcfe9a02b93e1c5a5da14bfda8c41f',
  'public/icons/icon-72x72.png': '2c80564bda774d59a145f5ce05b0cd4d',
  'public/icons/icon-96x96.png': 'ad68075f59b101ac4943c78e1fd9198e',
  'public/icons/icon-128x128.png': '51af1881513c675146ffc7e71532404c',
  'public/icons/icon-144x144.png': '66e8778e74bcd3d576f6e8017f790e37',
  'public/icons/icon-152x152.png': '73e796b03c858eacba425c4d23ec68a3',
  'public/icons/icon-192x192.png': 'fe38d9e1f1de91d8623bd412d4061850',
  'public/icons/icon-384x384.png': '747d0c4f12a19f93026d55a3f040d536',
  'public/icons/icon-512x512.png': '2cca1ff3051b0d322f30d39a37214e28',
};
const pngs = [72, 96, 128, 144, 152, 192, 384, 512].map((n) => [`public/icons/icon-${n}x${n}.png`, n]);
pngs.push(['public/icons/apple-touch-icon.png', 180]);

const fails = [];
const read = (f) => {
  try { return readFileSync(join(root, f)); } catch { fails.push(`${f}: missing`); return null; }
};
const md5 = (b) => createHash('md5').update(b).digest('hex');

for (const [f, size] of pngs) {
  const b = read(f);
  if (!b) continue;
  if (b.length < 24 || b.readUInt32BE(16) !== size || b.readUInt32BE(20) !== size) fails.push(`${f}: not ${size}x${size}`);
  if (oldMd5[f] && md5(b) === oldMd5[f]) fails.push(`${f}: still the old Angular icon`);
}
const ico = read('public/favicon.ico');
if (ico) {
  if (!ico.subarray(0, 6).equals(Buffer.from([0, 0, 1, 0, 2, 0]))) fails.push('public/favicon.ico: bad header');
  if (md5(ico) === oldMd5['public/favicon.ico']) fails.push('public/favicon.ico: still the old Angular icon');
}
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
console.log('BRAND_ICONS: ok (10 files)');
