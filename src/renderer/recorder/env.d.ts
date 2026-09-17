/// <reference types="vite/client" />

interface RecorderApi {
  onToggle: (callback: (action: 'start' | 'stop') => void) => void
  sendRecordingStopped: (audio: ArrayBuffer) => void
}

interface Window {
  recorderApi: RecorderApi
}
