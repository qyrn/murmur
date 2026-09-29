import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(projectRoot, 'src/renderer/public/vad')

const requireFromProject = createRequire(join(projectRoot, 'package.json'))
const vadEntry = requireFromProject.resolve('@ricky0123/vad-web')
const vadDist = dirname(vadEntry)
const onnxDist = dirname(createRequire(vadEntry).resolve('onnxruntime-web/wasm'))

const assets = [
  join(vadDist, 'silero_vad_v5.onnx'),
  join(vadDist, 'vad.worklet.bundle.min.js'),
  join(onnxDist, 'ort-wasm-simd-threaded.mjs'),
  join(onnxDist, 'ort-wasm-simd-threaded.wasm')
]

mkdirSync(outputDir, { recursive: true })
for (const asset of assets) {
  copyFileSync(asset, join(outputDir, asset.split(/[\\/]/).pop()))
}
console.log(`VAD assets copied to ${outputDir}`)
