/// <reference types="vite/client" />

import type {
  DictationRecord,
  DictationSettings,
  DictionaryEntry,
  HandsFreeStatus,
  VoiceShortcut
} from '../../shared/types'

declare global {
  interface SettingsApi {
    getSettings: () => Promise<DictationSettings>
    setSettings: (settings: DictationSettings) => Promise<void>
    getDictionary: () => Promise<DictionaryEntry[]>
    setDictionary: (entries: DictionaryEntry[]) => Promise<void>
    getShortcuts: () => Promise<VoiceShortcut[]>
    setShortcuts: (shortcuts: VoiceShortcut[]) => Promise<void>
    isPackaged: () => Promise<boolean>
    getAppVersion: () => Promise<string>
    getHistory: () => Promise<DictationRecord[]>
    getHandsFreeStatus: () => Promise<HandsFreeStatus>
    onHandsFreeStatus: (callback: (status: HandsFreeStatus) => void) => void
    minimizeWindow: () => void
    toggleMaximizeWindow: () => void
    closeWindow: () => void
  }

  interface Window {
    settingsApi: SettingsApi
  }
}
