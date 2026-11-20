import type { DictationSettings, DictionaryEntry, VoiceShortcut } from '../shared/types'
import { isArrayOfObjects, isPlainObject, readJsonFile, writeJsonFile } from './jsonFileStore'

const defaultSettings: DictationSettings = {
  hotkey: 'Control+Space',
  model: 'large-v3-turbo',
  autoPaste: true,
  disableHotkeyInFullscreen: true,
  microphoneDeviceId: null,
  keepMicrophoneOpen: false,
  launchAtStartup: false,
  startMinimized: false,
  overlayPosition: 'bottom-center',
  accentColor: '#e0a248',
  showWaveform: true,
  handsFreeEnabled: false,
  handsFreeSilenceSeconds: 3
}

const defaultDictionary: DictionaryEntry[] = [
  { term: 'JavaScript', note: 'toujours avec un J et un S majuscules' },
  { term: 'TypeScript', note: 'toujours avec un T et un S majuscules' },
  { term: 'pull request', note: 'terme anglais courant, ne pas traduire' },
  { term: 'deadline', note: 'terme anglais courant, ne pas traduire' },
  { term: 'overlay', note: 'terme anglais courant, ne pas traduire' }
]

const defaultShortcuts: VoiceShortcut[] = [{ spoken: 'slash', written: '/' }]

const SETTINGS_FILE = 'settings.json'
const DICTIONARY_FILE = 'dictionary.json'
const SHORTCUTS_FILE = 'shortcuts.json'

export function loadSettings(): DictationSettings {
  return { ...defaultSettings, ...readJsonFile<Partial<DictationSettings>>(SETTINGS_FILE, defaultSettings, isPlainObject) }
}

export function saveSettings(settings: DictationSettings): void {
  writeJsonFile(SETTINGS_FILE, settings)
}

export function loadDictionary(): DictionaryEntry[] {
  return readJsonFile<DictionaryEntry[]>(DICTIONARY_FILE, defaultDictionary, isArrayOfObjects)
}

export function saveDictionary(entries: DictionaryEntry[]): void {
  writeJsonFile(DICTIONARY_FILE, entries)
}

export function loadShortcuts(): VoiceShortcut[] {
  return readJsonFile<VoiceShortcut[]>(SHORTCUTS_FILE, defaultShortcuts, isArrayOfObjects)
}

export function saveShortcuts(shortcuts: VoiceShortcut[]): void {
  writeJsonFile(SHORTCUTS_FILE, shortcuts)
}
