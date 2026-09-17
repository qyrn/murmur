/// <reference types="vite/client" />

import type { DictationSettings, DictionaryEntry } from '../../shared/types'

declare global {
  interface SettingsApi {
    getSettings: () => Promise<DictationSettings>
    setSettings: (settings: DictationSettings) => Promise<void>
    getDictionary: () => Promise<DictionaryEntry[]>
    setDictionary: (entries: DictionaryEntry[]) => Promise<void>
    isPackaged: () => Promise<boolean>
  }

  interface Window {
    settingsApi: SettingsApi
  }
}
