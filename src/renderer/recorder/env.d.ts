/// <reference types="vite/client" />

import type { HandsFreeCommand } from '../../shared/types'

declare global {
  interface RecorderApi {
    onToggle: (callback: (action: 'start' | 'stop') => void) => void
    getMicrophoneDeviceId: () => Promise<string | null>
    sendRecordingStopped: (audio: ArrayBuffer) => void
    sendAudioLevel: (level: number) => void
    sendRecordingError: (message: string) => void
    onHandsFreeMode: (callback: (command: HandsFreeCommand) => void) => void
    onHandsFreeFinish: (callback: () => void) => void
    checkWakePhrase: (wav: ArrayBuffer) => Promise<boolean>
    checkStopPhrase: (wav: ArrayBuffer) => Promise<boolean>
    sendHandsFreeHearing: (hearing: boolean) => void
    sendHandsFreeAudio: (wav: ArrayBuffer) => void
  }

  interface Window {
    recorderApi: RecorderApi
  }
}
