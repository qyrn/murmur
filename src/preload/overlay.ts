import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/types'
import type { AppState, OverlayConfig } from '../shared/types'

const overlayApi = {
  onStateChange: (callback: (state: AppState) => void): void => {
    ipcRenderer.on(IpcChannel.OverlayState, (_event, state: AppState) => callback(state))
  },
  onAudioLevel: (callback: (level: number) => void): void => {
    ipcRenderer.on(IpcChannel.AudioLevel, (_event, level: number) => callback(level))
  },
  onConfig: (callback: (config: OverlayConfig) => void): void => {
    ipcRenderer.on(IpcChannel.OverlayConfig, (_event, config: OverlayConfig) => callback(config))
  }
}

contextBridge.exposeInMainWorld('overlayApi', overlayApi)

export type OverlayApi = typeof overlayApi
