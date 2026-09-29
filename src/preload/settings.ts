import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/types'
import type {
  DictationRecord,
  DictationSettings,
  DictionaryEntry,
  HandsFreeStatus,
  VoiceShortcut
} from '../shared/types'

const settingsApi = {
  getSettings: (): Promise<DictationSettings> => ipcRenderer.invoke(IpcChannel.GetSettings),
  setSettings: (settings: DictationSettings): Promise<void> => ipcRenderer.invoke(IpcChannel.SetSettings, settings),
  getDictionary: (): Promise<DictionaryEntry[]> => ipcRenderer.invoke(IpcChannel.GetDictionary),
  setDictionary: (entries: DictionaryEntry[]): Promise<void> => ipcRenderer.invoke(IpcChannel.SetDictionary, entries),
  getShortcuts: (): Promise<VoiceShortcut[]> => ipcRenderer.invoke(IpcChannel.GetShortcuts),
  setShortcuts: (shortcuts: VoiceShortcut[]): Promise<void> => ipcRenderer.invoke(IpcChannel.SetShortcuts, shortcuts),
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke(IpcChannel.IsPackaged),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IpcChannel.GetAppVersion),
  getHistory: (): Promise<DictationRecord[]> => ipcRenderer.invoke(IpcChannel.GetHistory),
  getHandsFreeStatus: (): Promise<HandsFreeStatus> => ipcRenderer.invoke(IpcChannel.GetHandsFreeStatus),
  onHandsFreeStatus: (callback: (status: HandsFreeStatus) => void): void => {
    ipcRenderer.on(IpcChannel.HandsFreeStatus, (_event, status: HandsFreeStatus) => callback(status))
  },
  minimizeWindow: (): void => ipcRenderer.send(IpcChannel.WindowMinimize),
  toggleMaximizeWindow: (): void => ipcRenderer.send(IpcChannel.WindowToggleMaximize),
  closeWindow: (): void => ipcRenderer.send(IpcChannel.WindowClose)
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)

export type SettingsApi = typeof settingsApi
