import { createHash, type Hash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync, unlinkSync, type WriteStream } from 'node:fs'
import { once } from 'node:events'
import { join } from 'node:path'
import { app, net } from 'electron'
import { WHISPER_MODELS, type WhisperModel } from '../shared/types'
import { engineRoot } from './enginePaths'

const MODEL_BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'
const STALL_TIMEOUT_MS = 60000

interface ModelFile {
  name: string
  bytes: number
  sha256: string
  replacedName: string
}

const MODEL_FILES: Record<WhisperModel, ModelFile> = {
  'large-v3-turbo': {
    name: 'ggml-large-v3-turbo-q5_0.bin',
    bytes: 574041195,
    sha256: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2',
    replacedName: 'ggml-large-v3-turbo.bin'
  },
  'large-v3': {
    name: 'ggml-large-v3-q5_0.bin',
    bytes: 1081140203,
    sha256: 'd75795ecff3f83b5faa89d1900604ad8c780abd5739fae406de19f23ecd98ad1',
    replacedName: 'ggml-large-v3.bin'
  }
}

function fileName(model: WhisperModel): string {
  return MODEL_FILES[model].name
}

function downloadedModelsDir(): string {
  if (process.platform === 'win32') {
    return join(process.env['LOCALAPPDATA'] ?? app.getPath('userData'), 'murmur', 'models')
  }
  const dataHome = process.env['XDG_DATA_HOME'] ?? join(app.getPath('home'), '.local/share')
  return join(dataHome, 'murmur', 'models')
}

function candidatePaths(model: WhisperModel): string[] {
  return [join(downloadedModelsDir(), fileName(model)), join(engineRoot, 'models', fileName(model))]
}

export function findModelFile(model: WhisperModel): string | null {
  return candidatePaths(model).find((path) => existsSync(path)) ?? null
}

export function installedModels(): WhisperModel[] {
  return WHISPER_MODELS.filter((model) => findModelFile(model) !== null)
}

async function hashExistingBytes(path: string, hash: Hash): Promise<void> {
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer)
  }
}

async function writeChunk(output: WriteStream, chunk: Uint8Array): Promise<void> {
  if (!output.write(chunk)) {
    await once(output, 'drain')
  }
}

async function closeStream(output: WriteStream): Promise<void> {
  output.end()
  await once(output, 'close')
}

async function fetchModel(model: WhisperModel, onProgress: (percent: number) => void): Promise<string> {
  const expected = MODEL_FILES[model]
  const directory = downloadedModelsDir()
  mkdirSync(directory, { recursive: true })
  const finalPath = join(directory, fileName(model))
  const partialPath = `${finalPath}.part`

  let received = existsSync(partialPath) ? statSync(partialPath).size : 0
  if (received > expected.bytes) {
    unlinkSync(partialPath)
    received = 0
  }
  let hash = createHash('sha256')
  if (received > 0) {
    await hashExistingBytes(partialPath, hash)
  }

  if (received < expected.bytes) {
    const abort = new AbortController()
    let stallTimer = setTimeout(() => abort.abort(), STALL_TIMEOUT_MS)
    const resetStallTimer = (): void => {
      clearTimeout(stallTimer)
      stallTimer = setTimeout(() => abort.abort(), STALL_TIMEOUT_MS)
    }
    try {
      const response = await net.fetch(`${MODEL_BASE_URL}/${fileName(model)}`, {
        headers: received > 0 ? { Range: `bytes=${received}-` } : {},
        signal: abort.signal
      })
      if (response.status === 200 && received > 0) {
        received = 0
        hash = createHash('sha256')
      } else if (response.status !== 200 && response.status !== 206) {
        throw new Error(`téléchargement du modèle refusé (HTTP ${response.status})`)
      }
      if (!response.body) {
        throw new Error('réponse vide pendant le téléchargement du modèle')
      }

      const output = createWriteStream(partialPath, { flags: received > 0 ? 'a' : 'w' })
      let lastPercent = -1
      try {
        for await (const chunk of response.body) {
          resetStallTimer()
          hash.update(chunk)
          await writeChunk(output, chunk)
          received += chunk.byteLength
          const percent = Math.floor((received / expected.bytes) * 100)
          if (percent !== lastPercent) {
            lastPercent = percent
            onProgress(percent)
          }
        }
      } finally {
        await closeStream(output)
      }
    } finally {
      clearTimeout(stallTimer)
    }
  }

  if (received !== expected.bytes || hash.digest('hex') !== expected.sha256) {
    unlinkSync(partialPath)
    throw new Error(`modèle ${model} corrompu après téléchargement, fichier supprimé`)
  }
  renameSync(partialPath, finalPath)
  rmSync(join(directory, expected.replacedName), { force: true })
  return finalPath
}

const downloadsInFlight = new Map<WhisperModel, Promise<string>>()

export function downloadModel(model: WhisperModel, onProgress: (percent: number) => void): Promise<string> {
  const existing = downloadsInFlight.get(model)
  if (existing) {
    return existing
  }
  const download = fetchModel(model, onProgress).finally(() => downloadsInFlight.delete(model))
  downloadsInFlight.set(model, download)
  return download
}
