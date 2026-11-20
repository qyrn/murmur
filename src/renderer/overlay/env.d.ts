/// <reference types="vite/client" />

interface OverlayConfig {
  accentColor: string
  showWaveform: boolean
  language: 'fr' | 'en'
}

interface OverlayApi {
  onStateChange: (callback: (state: string) => void) => void
  onAudioLevel: (callback: (level: number) => void) => void
  onDownloadProgress: (callback: (percent: number) => void) => void
  onConfig: (callback: (config: OverlayConfig) => void) => void
}

interface Window {
  overlayApi: OverlayApi
}
