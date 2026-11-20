import { createHash, type Hash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync, type WriteStream } from 'node:fs'
import { once } from 'node:events'
import { join } from 'node:path'
import { app, net } from 'electron'
import { WHISPER_MODELS, type WhisperModel } from '../shared/types'
import { engineRoot } from './enginePaths'

const MODEL_BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'
const STALL_TIMEOUT_MS = 60000

interface ModelFile {
  bytes: number
  sha256: string
}

const MODEL_FILES: Record<WhisperModel, ModelFile> = {
  'large-v3-turbo': {
    bytes: 1624555275,
    sha256: '1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69'
  },
  'large-v3': {
    bytes: 3095033483,
    sha256: '64d182b440b98d5203c4f9bd541544d84c605196c4f7b845dfa11fb23594d1e2'
  }
}

function fileName(model: WhisperModel): string {
  return `ggml-${model}.bin`
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
