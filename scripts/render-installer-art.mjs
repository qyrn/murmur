import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const installerDir = join(rootDir, 'resources/installer')
const kronaOneWoff = join(rootDir, 'node_modules/@fontsource/krona-one/files/krona-one-latin-400-normal.woff')
const RENDER_DENSITY = 288
const ARTWORK = [
  { name: 'sidebar', width: 164, height: 314, background: '#000000' },
  { name: 'header', width: 150, height: 57, background: '#ffffff' }
]

function woffToTtf(woff) {
  const tableCount = woff.readUInt16BE(12)
  const tables = Array.from({ length: tableCount }, (_, index) => {
    const entry = 44 + index * 20
    const offset = woff.readUInt32BE(entry + 4)
    const compressedLength = woff.readUInt32BE(entry + 8)
    const originalLength = woff.readUInt32BE(entry + 12)
    const stored = woff.subarray(offset, offset + compressedLength)
    return {
      tag: woff.subarray(entry, entry + 4),
      checksum: woff.readUInt32BE(entry + 16),
      data: compressedLength < originalLength ? inflateSync(stored) : stored
    }
  })
  const entrySelector = Math.floor(Math.log2(tableCount))
  const searchRange = 2 ** entrySelector * 16
  const header = Buffer.alloc(12 + tableCount * 16)
  header.writeUInt32BE(woff.readUInt32BE(4), 0)
  header.writeUInt16BE(tableCount, 4)
  header.writeUInt16BE(searchRange, 6)
  header.writeUInt16BE(entrySelector, 8)
  header.writeUInt16BE(tableCount * 16 - searchRange, 10)
  const bodies = []
  let offset = header.length
  tables.forEach(({ tag, checksum, data }, index) => {
    const record = 12 + index * 16
    tag.copy(header, record)
    header.writeUInt32BE(checksum, record + 4)
    header.writeUInt32BE(offset, record + 8)
    header.writeUInt32BE(data.length, record + 12)
    const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4)
    data.copy(padded)
    bodies.push(padded)
    offset += padded.length
  })
  return Buffer.concat([header, ...bodies])
}

const fontconfigDir = mkdtempSync(join(tmpdir(), 'murmur-fonts-'))
writeFileSync(join(fontconfigDir, 'krona-one.ttf'), woffToTtf(readFileSync(kronaOneWoff)))
writeFileSync(
  join(fontconfigDir, 'fonts.conf'),
  `<?xml version="1.0"?><fontconfig><dir>${fontconfigDir}</dir><cachedir>${fontconfigDir}</cachedir></fontconfig>`
)
process.env['FONTCONFIG_FILE'] = join(fontconfigDir, 'fonts.conf')
const { default: sharp } = await import('sharp')

function encodeBmp24(rgb, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelBytes = rowSize * height
  const file = Buffer.alloc(54 + pixelBytes)
  file.write('BM', 0, 'ascii')
  file.writeUInt32LE(file.length, 2)
  file.writeUInt32LE(54, 10)
  file.writeUInt32LE(40, 14)
  file.writeInt32LE(width, 18)
  file.writeInt32LE(height, 22)
  file.writeUInt16LE(1, 26)
  file.writeUInt16LE(24, 28)
  file.writeUInt32LE(pixelBytes, 34)
  for (let y = 0; y < height; y++) {
    const rowStart = 54 + (height - 1 - y) * rowSize
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 3
      const target = rowStart + x * 3
      file[target] = rgb[source + 2]
      file[target + 1] = rgb[source + 1]
      file[target + 2] = rgb[source]
    }
  }
  return file
}

try {
  for (const { name, width, height, background } of ARTWORK) {
    const pipeline = sharp(readFileSync(join(installerDir, `${name}.svg`)), { density: RENDER_DENSITY })
      .resize(width, height)
      .flatten({ background })
    const rgb = await pipeline.removeAlpha().raw().toBuffer()
    writeFileSync(join(installerDir, `${name}.bmp`), encodeBmp24(rgb, width, height))
  }
} finally {
  rmSync(fontconfigDir, { recursive: true, force: true })
}

console.log(`Visuels de l'installeur générés dans ${installerDir}`)
