import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { app } from 'electron'
import type { WhisperModel } from '../shared/types'

const SERVER_PORT = 8178
const SERVER_HOST = '127.0.0.1'

const engineRoot = app.isPackaged
  ? join(process.resourcesPath, 'whisper-engine')
  : join(__dirname, '../../whisper-engine')

const serverBinary = join(engineRoot, 'whisper.cpp/build/bin/Release/whisper-server.exe')

function modelPath(model: WhisperModel): string {
  return join(engineRoot, `models/ggml-${model}.bin`)
}

let serverProcess: ChildProcessWithoutNullStreams | null = null
let readyPromise: Promise<void> | null = null
let currentModel: WhisperModel | null = null

export function serverBaseUrl(): string {
  return `http://${SERVER_HOST}:${SERVER_PORT}`
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${serverBaseUrl()}/`, { method: 'GET' })
      if (response.ok || response.status === 404) {
        return
      }
    } catch {
      // le serveur n'est pas encore prêt, on réessaie
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('whisper-server ne répond pas après le délai imparti')
}

export async function ensureWhisperServer(model: WhisperModel): Promise<void> {
  if (serverProcess && currentModel === model && readyPromise) {
    return readyPromise
  }

  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }

  if (!existsSync(serverBinary)) {
    throw new Error(`whisper-server introuvable : ${serverBinary}. Lance scripts/setup-whisper.ps1 d'abord.`)
  }
  if (!existsSync(modelPath(model))) {
    throw new Error(`Modèle introuvable : ${modelPath(model)}. Lance scripts/download-model.ps1 d'abord.`)
  }

  currentModel = model
  readyPromise = new Promise<void>((resolvePromise, rejectPromise) => {
    const proc = spawn(
      serverBinary,
      ['--model', modelPath(model), '--host', SERVER_HOST, '--port', String(SERVER_PORT), '--language', 'fr'],
      { stdio: 'pipe' }
    )
    serverProcess = proc

    proc.on('error', (err) => rejectPromise(err))
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        rejectPromise(new Error(`whisper-server s'est arrêté avec le code ${code}`))
      }
      serverProcess = null
      readyPromise = null
    })

    waitForHealth(30000).then(resolvePromise, rejectPromise)
  })

  return readyPromise
}

export function stopWhisperServer(): void {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
    readyPromise = null
    currentModel = null
  }
}
