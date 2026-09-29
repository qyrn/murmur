export type WhisperModel = 'large-v3-turbo' | 'large-v3'

export type OverlayPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center'

export interface DictationSettings {
  hotkey: string
  model: WhisperModel
  autoPaste: boolean
  disableHotkeyInFullscreen: boolean
  microphoneDeviceId: string | null
  launchAtStartup: boolean
  startMinimized: boolean
  overlayPosition: OverlayPosition
  accentColor: string
  showWaveform: boolean
  handsFreeEnabled: boolean
  handsFreeSilenceSeconds: number
}

export interface DictionaryEntry {
  term: string
  note: string
}

export interface VoiceShortcut {
  spoken: string
  written: string
}

export interface DictationRecord {
  timestamp: number
  wordCount: number
  durationMs: number
  appName: string
  text: string
}

export type AppState = 'idle' | 'loading-model' | 'recording' | 'transcribing' | 'error'

export type HandsFreeMode = 'off' | 'standby'

export interface HandsFreeCommand {
  mode: HandsFreeMode
  silenceSeconds: number
}

export type HandsFreeActivity = 'disabled' | 'paused' | 'standby' | 'hearing' | 'dictating'

export interface HandsFreeStatus {
  activity: HandsFreeActivity
  lastHeard: string | null
}

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
  GetShortcuts: 'shortcuts:get',
  SetShortcuts: 'shortcuts:set',
  IsPackaged: 'app:is-packaged',
  GetAppVersion: 'app:get-version',
  GetHistory: 'history:get',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggle-maximize',
  WindowClose: 'window:close',
  HandsFreeMode: 'hands-free:mode',
  HandsFreeFinish: 'hands-free:finish',
  HandsFreeCheckWake: 'hands-free:check-wake',
  HandsFreeCheckStop: 'hands-free:check-stop',
  HandsFreeHearing: 'hands-free:hearing',
  HandsFreeAudio: 'hands-free:audio',
  HandsFreeStatus: 'hands-free:status',
  GetHandsFreeStatus: 'hands-free:get-status'
} as const
