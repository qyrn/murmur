/// <reference types="vite/client" />

interface OverlayApi {
  onStateChange: (callback: (state: string) => void) => void
  onAudioLevel: (callback: (level: number) => void) => void
}

interface Window {
  overlayApi: OverlayApi
}
