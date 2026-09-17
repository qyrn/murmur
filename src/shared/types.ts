export type WhisperModel = 'large-v3-turbo' | 'large-v3'

export type OverlayPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center'

export interface DictationSettings {
  hotkey: string
  model: WhisperModel
  autoPaste: boolean
  microphoneDeviceId: string | null
  launchAtStartup: boolean
  startMinimized: boolean
  overlayPosition: OverlayPosition
  accentColor: string
  showWaveform: boolean
}

export interface DictionaryEntry {
  term: string
  note: string
}

export type AppState = 'idle' | 'loading-model' | 'recording' | 'transcribing' | 'error'

export interface OverlayConfig {
  accentColor: string
  showWaveform: boolean
}

export const IpcChannel = {
  ToggleDictation: 'dictation:toggle',
  RecordingStopped: 'recorder:recording-stopped',
  RecordingError: 'recorder:recording-error',
  AudioLevel: 'recorder:audio-level',
  OverlayState: 'overlay:state',
  OverlayConfig: 'overlay:config',
  GetSettings: 'settings:get',
  SetSettings: 'settings:set',
  GetDictionary: 'dictionary:get',
  SetDictionary: 'dictionary:set',
  IsPackaged: 'app:is-packaged'
} as const
