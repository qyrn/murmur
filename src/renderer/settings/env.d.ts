/// <reference types="vite/client" />

import type { DictationRecord, DictationSettings, DictionaryEntry } from '../../shared/types'

declare global {
  interface SettingsApi {
    getSettings: () => Promise<DictationSettings>
    setSettings: (settings: DictationSettings) => Promise<void>
    getDictionary: () => Promise<DictionaryEntry[]>
    setDictionary: (entries: DictionaryEntry[]) => Promise<void>
    isPackaged: () => Promise<boolean>
    getAppVersion: () => Promise<string>
    getHistory: () => Promise<DictationRecord[]>
    minimizeWindow: () => void
    toggleMaximizeWindow: () => void
    closeWindow: () => void
  }

  interface Window {
    settingsApi: SettingsApi
  }
}
