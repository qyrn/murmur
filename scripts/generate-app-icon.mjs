import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../resources')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function buildPng(size, colorAt) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8)
  ihdr.writeUInt8(6, 9)

  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = colorAt(x, y, size)
      const px = rowStart + 1 + x * 4
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
      raw[px + 3] = a
    }
  }
  const idat = deflateSync(raw)

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const BG = [0x17, 0x16, 0x13]
const ACCENT = [0xe0, 0xa2, 0x48]
const BAR_SHAPE = [0.45, 0.7, 0.95, 1, 0.95, 0.7, 0.45]

function iconColorer(x, y, size) {
  const cornerRadius = size * 0.22
  const inCorner = (cx, cy) => Math.hypot(x - cx, y - cy) > cornerRadius
  const nearLeft = x < cornerRadius
  const nearRight = x > size - cornerRadius
  const nearTop = y < cornerRadius
  const nearBottom = y > size - cornerRadius
  if (nearLeft && nearTop && inCorner(cornerRadius, cornerRadius)) return [0, 0, 0, 0]
  if (nearRight && nearTop && inCorner(size - cornerRadius, cornerRadius)) return [0, 0, 0, 0]
  if (nearLeft && nearBottom && inCorner(cornerRadius, size - cornerRadius)) return [0, 0, 0, 0]
  if (nearRight && nearBottom && inCorner(size - cornerRadius, size - cornerRadius)) return [0, 0, 0, 0]

  const barCount = BAR_SHAPE.length
  const barWidth = size * 0.06
  const gap = size * 0.045
  const totalWidth = barCount * barWidth + (barCount - 1) * gap
  const startX = (size - totalWidth) / 2

  for (let i = 0; i < barCount; i++) {
    const barX = startX + i * (barWidth + gap)
    if (x >= barX && x < barX + barWidth) {
      const barHeight = size * 0.5 * BAR_SHAPE[i]
      const top = (size - barHeight) / 2
      const bottom = top + barHeight
      if (y >= top && y <= bottom) {
        return [...ACCENT, 255]
      }
    }
  }

  return [...BG, 255]
}

function chunkIco(sizes) {
  const images = sizes.map((size) => buildPng(size, iconColorer))
  const dirEntries = []
  let offset = 6 + sizes.length * 16
  const buffers = [Buffer.alloc(0)]

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i]
    const png = images[i]
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    dirEntries.push(entry)
    offset += png.length
    buffers.push(png)
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)

  return Buffer.concat([header, ...dirEntries, ...buffers.slice(1)])
}

const ico = chunkIco([16, 32, 48, 64, 128, 256])
writeFileSync(join(outDir, 'icon.ico'), ico)

const previewPng = buildPng(256, iconColorer)
writeFileSync(join(outDir, 'icon.png'), previewPng)

console.log(`Icone generee : ${join(outDir, 'icon.ico')}`)
