import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const resourcesDir = join(dirname(fileURLToPath(import.meta.url)), '../resources')
const iconsDir = join(resourcesDir, 'icons')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const TRAY_SIZE = 64
const RENDER_DENSITY = 300
const TRAY_STATES = ['idle', 'listening', 'recording', 'transcribing', 'error']

function renderPng(svgPath, size) {
  return sharp(readFileSync(svgPath), { density: RENDER_DENSITY })
    .resize(size, size)
    .png()
    .toBuffer()
}

function buildIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = header.length + pngs.length * 16
  const entries = pngs.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...pngs.map(({ png }) => png)])
}

const appSvg = join(iconsDir, 'app.svg')
writeFileSync(join(resourcesDir, 'icon.png'), await renderPng(appSvg, 512))
const icoImages = await Promise.all(ICO_SIZES.map(async (size) => ({ size, png: await renderPng(appSvg, size) })))
writeFileSync(join(resourcesDir, 'icon.ico'), buildIco(icoImages))

for (const state of TRAY_STATES) {
  const png = await renderPng(join(iconsDir, `tray-${state}.svg`), TRAY_SIZE)
  writeFileSync(join(resourcesDir, 'tray', `${state}.png`), png)
}

console.log(`Icônes générées dans ${resourcesDir}`)
