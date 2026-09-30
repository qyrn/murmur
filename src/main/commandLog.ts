import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface VoiceCommandAttempt {
  timestamp: number
  command: 'start' | 'stop'
  heard: string
  recognized: boolean
}

const MAX_ENTRIES = 500

function commandLogPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'voice-commands.json')
}

function loadCommandLog(): VoiceCommandAttempt[] {
  const path = commandLogPath()
  if (!existsSync(path)) {
    return []
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as VoiceCommandAttempt[]
}

export function recordCommandAttempt(attempt: VoiceCommandAttempt): void {
  const attempts = [...loadCommandLog(), attempt].slice(-MAX_ENTRIES)
  writeFileSync(commandLogPath(), JSON.stringify(attempts, null, 2), 'utf-8')
}
