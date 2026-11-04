import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { app } from 'electron'
import type { WhisperModel } from '../shared/types'

const SERVER_PORT = 8178
const SERVER_HOST = '127.0.0.1'
const PARENT_DEATH_WRAPPER = '/usr/bin/setpriv'

const engineRoot = app.isPackaged
  ? join(process.resourcesPath, 'whisper-engine')
  : join(__dirname, '../../whisper-engine')

const isWindows = process.platform === 'win32'
const serverBinary = join(engineRoot, `whisper.cpp/build/bin/whisper-server${isWindows ? '.exe' : ''}`)
const setupScriptName = isWindows ? 'setup-whisper.ps1' : 'setup-whisper.sh'
const downloadScriptName = isWindows ? 'download-model.ps1' : 'download-model.sh'

function serverEnvironment(): NodeJS.ProcessEnv {
  if (isWindows) {
    return process.env
  }
  const libraryDir = dirname(serverBinary)
  const existing = process.env['LD_LIBRARY_PATH']
  return { ...process.env, LD_LIBRARY_PATH: existing ? `${libraryDir}:${existing}` : libraryDir }
}

function modelPath(model: WhisperModel): string {
  return join(engineRoot, `models/ggml-${model}.bin`)
}

function serverCommand(model: WhisperModel): { command: string; args: string[] } {
  const serverArgs = [
    '--model',
    modelPath(model),
    '--host',
    SERVER_HOST,
    '--port',
    String(SERVER_PORT),
    '--language',
    'fr'
  ]
  if (isWindows || !existsSync(PARENT_DEATH_WRAPPER)) {
    return { command: serverBinary, args: serverArgs }
  }
  return { command: PARENT_DEATH_WRAPPER, args: ['--pdeathsig', 'KILL', '--', serverBinary, ...serverArgs] }
}

let serverProcess: ChildProcessWithoutNullStreams | null = null
let readyPromise: Promise<void> | null = null
let currentModel: WhisperModel | null = null

export function serverBaseUrl(): string {
  return `http://${SERVER_HOST}:${SERVER_PORT}`
}

async function serverAnswers(): Promise<boolean> {
  try {
    const response = await fetch(`${serverBaseUrl()}/`, { method: 'GET' })
    return response.ok || response.status === 404
  } catch {
    return false
  }
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await serverAnswers()) {
      return
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
    throw new Error(`whisper-server introuvable : ${serverBinary}. Lance scripts/${setupScriptName} d'abord.`)
  }
  if (!existsSync(modelPath(model))) {
    throw new Error(`Modèle introuvable : ${modelPath(model)}. Lance scripts/${downloadScriptName} d'abord.`)
  }

  currentModel = model
  readyPromise = new Promise<void>((resolvePromise, rejectPromise) => {
    const { command, args } = serverCommand(model)
    const proc = spawn(command, args, { stdio: 'pipe', env: serverEnvironment() })
    serverProcess = proc
    proc.stdout.on('data', (chunk: Buffer) => console.log('[whisper-server]', chunk.toString().trim()))
    proc.stderr.on('data', (chunk: Buffer) => console.log('[whisper-server]', chunk.toString().trim()))

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
