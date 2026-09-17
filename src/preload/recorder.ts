import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/types'

const recorderApi = {
  onToggle: (callback: (action: 'start' | 'stop') => void): void => {
    ipcRenderer.on(IpcChannel.ToggleDictation, (_event, action: 'start' | 'stop') => callback(action))
  },
  sendRecordingStopped: (audio: ArrayBuffer): void => {
    ipcRenderer.send(IpcChannel.RecordingStopped, audio)
  },
  sendAudioLevel: (level: number): void => {
    ipcRenderer.send(IpcChannel.AudioLevel, level)
  }
}

contextBridge.exposeInMainWorld('recorderApi', recorderApi)

export type RecorderApi = typeof recorderApi
