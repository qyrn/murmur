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

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8)
  ihdr.writeUInt8(6, 9)

  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function mix(a, b, t) {
  return a + (b - a) * t
}

// Signed distance to an axis-aligned rounded rectangle centered at (cx, cy).
function sdRoundedBox(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - halfW + radius
  const dy = Math.abs(py - cy) - halfH + radius
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0))
  const inside = Math.min(Math.max(dx, dy), 0)
  return outside + inside - radius
}

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

const BG_TOP = hexToRgb('#211d17')
const BG_BOTTOM = hexToRgb('#100e0b')
const ACCENT_TOP = hexToRgb('#f2b767')
const ACCENT_BOTTOM = hexToRgb('#c97f2e')

const BAR_SHAPE = [0.4, 0.62, 0.85, 1, 0.85, 0.62, 0.4]

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const bgRadius = size * 0.222
  const bgHalf = size / 2 - size * 0.02
  const center = size / 2

  const barCount = BAR_SHAPE.length
  const barWidth = size * 0.072
  const gap = size * 0.045
  const totalWidth = barCount * barWidth + (barCount - 1) * gap
  const startX = (size - totalWidth) / 2
  const barRadius = barWidth / 2

  const bars = []
  for (let i = 0; i < barCount; i++) {
    const barHeight = size * 0.52 * BAR_SHAPE[i]
    const barCx = startX + i * (barWidth + gap) + barWidth / 2
    bars.push({ cx: barCx, halfW: barWidth / 2, halfH: barHeight / 2 })
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5

      const bgDist = sdRoundedBox(px, py, center, center, bgHalf, bgHalf, bgRadius)
      const bgAlpha = clamp01(0.5 - bgDist)

      const vertical = clamp01(py / size)
      const glowDist = Math.hypot(px - center, py - center * 0.95) / (size * 0.55)
      const glow = clamp01(1 - glowDist) * 0.12
      let r = mix(BG_TOP[0], BG_BOTTOM[0], vertical) + glow * ACCENT_TOP[0] * 0.3
      let g = mix(BG_TOP[1], BG_BOTTOM[1], vertical) + glow * ACCENT_TOP[1] * 0.3
      let b = mix(BG_TOP[2], BG_BOTTOM[2], vertical) + glow * ACCENT_TOP[2] * 0.3

      let bestBarAlpha = 0
      let bestBarT = 0
      for (const bar of bars) {
        const barDist = sdRoundedBox(px, py, bar.cx, center, bar.halfW, bar.halfH, barRadius)
        const barAlpha = clamp01(0.5 - barDist)
        if (barAlpha > bestBarAlpha) {
          bestBarAlpha = barAlpha
          bestBarT = clamp01((py - (center - bar.halfH)) / (bar.halfH * 2))
        }
      }

      if (bestBarAlpha > 0) {
        const barR = mix(ACCENT_TOP[0], ACCENT_BOTTOM[0], bestBarT)
        const barG = mix(ACCENT_TOP[1], ACCENT_BOTTOM[1], bestBarT)
        const barB = mix(ACCENT_TOP[2], ACCENT_BOTTOM[2], bestBarT)
        r = mix(r, barR, bestBarAlpha)
        g = mix(g, barG, bestBarAlpha)
        b = mix(b, barB, bestBarAlpha)
      }

      const idx = (y * size + x) * 4
      rgba[idx] = Math.round(clamp01(r / 255) * 255)
      rgba[idx + 1] = Math.round(clamp01(g / 255) * 255)
      rgba[idx + 2] = Math.round(clamp01(b / 255) * 255)
      rgba[idx + 3] = Math.round(bgAlpha * 255)
    }
  }

  return rgba
}

function buildIcoBuffer(sizes) {
  const images = sizes.map((size) => encodePng(size, renderIcon(size)))
  const dirEntries = []
  let offset = 6 + sizes.length * 16
  const buffers = []

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

  return Buffer.concat([header, ...dirEntries, ...buffers])
}

const sizes = [16, 24, 32, 48, 64, 128, 256]
writeFileSync(join(outDir, 'icon.ico'), buildIcoBuffer(sizes))
writeFileSync(join(outDir, 'icon.png'), encodePng(512, renderIcon(512)))

console.log(`Icone generee : ${join(outDir, 'icon.ico')}`)
