import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DictationSettings, DictionaryEntry } from '../shared/types'

const defaultSettings: DictationSettings = {
  hotkey: 'Control+Space',
  model: 'large-v3-turbo',
  autoPaste: true,
  microphoneDeviceId: null,
  launchAtStartup: false,
  startMinimized: false,
  overlayPosition: 'bottom-center',
  accentColor: '#e0a248',
  showWaveform: true
}

const defaultDictionary: DictionaryEntry[] = [
  { term: 'JavaScript', note: 'toujours avec un J et un S majuscules' },
  { term: 'TypeScript', note: 'toujours avec un T et un S majuscules' },
  { term: 'pull request', note: 'terme anglais courant, ne pas traduire' },
  { term: 'deadline', note: 'terme anglais courant, ne pas traduire' },
  { term: 'overlay', note: 'terme anglais courant, ne pas traduire' }
]

function userDataDir(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function settingsPath(): string {
  return join(userDataDir(), 'settings.json')
}

function dictionaryPath(): string {
  return join(userDataDir(), 'dictionary.json')
}

export function loadSettings(): DictationSettings {
  const path = settingsPath()
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(defaultSettings, null, 2), 'utf-8')
    return defaultSettings
  }
  const raw = readFileSync(path, 'utf-8')
  return { ...defaultSettings, ...(JSON.parse(raw) as Partial<DictationSettings>) }
}

export function saveSettings(settings: DictationSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function loadDictionary(): DictionaryEntry[] {
  const path = dictionaryPath()
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(defaultDictionary, null, 2), 'utf-8')
    return defaultDictionary
  }
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw) as DictionaryEntry[]
}

export function saveDictionary(entries: DictionaryEntry[]): void {
  writeFileSync(dictionaryPath(), JSON.stringify(entries, null, 2), 'utf-8')
}
