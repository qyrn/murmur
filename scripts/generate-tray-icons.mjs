import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../resources/tray')
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

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

function renderDot(size, hex) {
  const rgba = Buffer.alloc(size * size * 4)
  const [r0, g0, b0] = hexToRgb(hex)
  const top = [Math.min(255, r0 + 35), Math.min(255, g0 + 35), Math.min(255, b0 + 35)]
  const bottom = [Math.max(0, r0 - 25), Math.max(0, g0 - 25), Math.max(0, b0 - 25)]
  const rim = [Math.min(255, r0 + 70), Math.min(255, g0 + 70), Math.min(255, b0 + 70)]

  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - size * 0.06
  const rimWidth = size * 0.07

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const dist = Math.hypot(px - cx, py - cy)
      const alpha = clamp01(0.5 - (dist - radius))

      const t = clamp01((py - (cy - radius)) / (radius * 2))
      let cr = mix(top[0], bottom[0], t)
      let cg = mix(top[1], bottom[1], t)
      let cb = mix(top[2], bottom[2], t)

      const rimT = clamp01(1 - Math.abs(dist - (radius - rimWidth / 2)) / (rimWidth / 2))
      cr = mix(cr, rim[0], rimT * 0.5)
      cg = mix(cg, rim[1], rimT * 0.5)
      cb = mix(cb, rim[2], rimT * 0.5)

      const idx = (y * size + x) * 4
      rgba[idx] = Math.round(cr)
      rgba[idx + 1] = Math.round(cg)
      rgba[idx + 2] = Math.round(cb)
      rgba[idx + 3] = Math.round(alpha * 255)
    }
  }

  return rgba
}

const icons = {
  idle: '#b7b2a6',
  recording: '#e5484d',
  transcribing: '#f2b767',
  error: '#8a231d'
}

const SIZE = 64

for (const [name, hex] of Object.entries(icons)) {
  const png = encodePng(SIZE, renderDot(SIZE, hex))
  writeFileSync(join(outDir, `${name}.png`), png)
}

console.log(`Icones generees dans ${outDir}`)
