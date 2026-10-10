/**
 * Builds a zip from a folder (test helper for design-handoff-ingest; plan 405).
 * Text files are deflated, the rest stored, so the reader's two methods are both exercised.
 * `node scripts/test/fixtures/design-port/make-zip.mjs` regenerates handoff.zip next to it.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'
import { crc32, deflateRawSync } from 'zlib'

export function zipFolder(dir, { prefix = '' } = {}) {
  const files = []
  const walk = d => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else files.push([prefix + relative(dir, p).split(sep).join('/'), readFileSync(p)])
    }
  }
  walk(dir)
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8')
    const deflate = /\.(md|html|js|css)$/.test(name)
    const body = deflate ? deflateRawSync(data) : data
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt16LE(deflate ? 8 : 0, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(deflate ? 8 : 0, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBuf, body)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + body.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url))
  writeFileSync(join(here, 'handoff.zip'), zipFolder(join(here, 'handoff')))
  console.log('wrote handoff.zip')
}
