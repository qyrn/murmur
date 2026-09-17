import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/types'
import type { DictationSettings, DictionaryEntry } from '../shared/types'

const settingsApi = {
  getSettings: (): Promise<DictationSettings> => ipcRenderer.invoke(IpcChannel.GetSettings),
  setSettings: (settings: DictationSettings): Promise<void> => ipcRenderer.invoke(IpcChannel.SetSettings, settings),
  getDictionary: (): Promise<DictionaryEntry[]> => ipcRenderer.invoke(IpcChannel.GetDictionary),
  setDictionary: (entries: DictionaryEntry[]): Promise<void> => ipcRenderer.invoke(IpcChannel.SetDictionary, entries)
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)

export type SettingsApi = typeof settingsApi
