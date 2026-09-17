/// <reference types="vite/client" />

interface RecorderApi {
  onToggle: (callback: (action: 'start' | 'stop') => void) => void
  sendRecordingStopped: (audio: ArrayBuffer) => void
  sendAudioLevel: (level: number) => void
  sendRecordingError: (message: string) => void
}

interface Window {
  recorderApi: RecorderApi
}
