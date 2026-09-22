import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DictationRecord } from '../shared/types'

const MAX_ENTRIES = 500

function userDataDir(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function historyPath(): string {
  return join(userDataDir(), 'history.json')
}

export function loadHistory(): DictationRecord[] {
  const path = historyPath()
  if (!existsSync(path)) {
    return []
  }
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw) as DictationRecord[]
}

export function appendHistoryEntry(entry: DictationRecord): void {
  const history = loadHistory()
  history.push(entry)
  const trimmed = history.length > MAX_ENTRIES ? history.slice(history.length - MAX_ENTRIES) : history
  writeFileSync(historyPath(), JSON.stringify(trimmed, null, 2), 'utf-8')
}
