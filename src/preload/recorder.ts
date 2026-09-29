import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/types'
import type { DictationSettings, HandsFreeCommand } from '../shared/types'

const recorderApi = {
  onToggle: (callback: (action: 'start' | 'stop') => void): void => {
    ipcRenderer.on(IpcChannel.ToggleDictation, (_event, action: 'start' | 'stop') => callback(action))
  },
  getMicrophoneDeviceId: async (): Promise<string | null> => {
    const settings = (await ipcRenderer.invoke(IpcChannel.GetSettings)) as DictationSettings
    return settings.microphoneDeviceId
  },
  sendRecordingStopped: (audio: ArrayBuffer): void => {
    ipcRenderer.send(IpcChannel.RecordingStopped, audio)
  },
  sendAudioLevel: (level: number): void => {
    ipcRenderer.send(IpcChannel.AudioLevel, level)
  },
  sendRecordingError: (message: string): void => {
    ipcRenderer.send(IpcChannel.RecordingError, message)
  },
  onHandsFreeMode: (callback: (command: HandsFreeCommand) => void): void => {
    ipcRenderer.on(IpcChannel.HandsFreeMode, (_event, command: HandsFreeCommand) => callback(command))
  },
  onHandsFreeFinish: (callback: () => void): void => {
    ipcRenderer.on(IpcChannel.HandsFreeFinish, () => callback())
  },
  checkWakePhrase: (wav: ArrayBuffer): Promise<boolean> => ipcRenderer.invoke(IpcChannel.HandsFreeCheckWake, wav),
  checkStopPhrase: (wav: ArrayBuffer): Promise<boolean> => ipcRenderer.invoke(IpcChannel.HandsFreeCheckStop, wav),
  sendHandsFreeHearing: (hearing: boolean): void => {
    ipcRenderer.send(IpcChannel.HandsFreeHearing, hearing)
  },
  sendHandsFreeAudio: (wav: ArrayBuffer): void => {
    ipcRenderer.send(IpcChannel.HandsFreeAudio, wav)
  }
}

contextBridge.exposeInMainWorld('recorderApi', recorderApi)

export type RecorderApi = typeof recorderApi
