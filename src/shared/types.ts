export const WHISPER_MODELS = ['large-v3-turbo', 'large-v3'] as const

export type WhisperModel = (typeof WHISPER_MODELS)[number]

export type OverlayPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center'

export type InterfaceLanguage = 'fr' | 'en'

export type InterfaceLanguageSetting = 'auto' | InterfaceLanguage

export interface DictationSettings {
  hotkey: string
  model: WhisperModel
  autoPaste: boolean
  disableHotkeyInFullscreen: boolean
  microphoneDeviceId: string | null
  keepMicrophoneOpen: boolean
  launchAtStartup: boolean
  startMinimized: boolean
  overlayPosition: OverlayPosition
  accentColor: string
  showWaveform: boolean
  handsFreeEnabled: boolean
  handsFreeSilenceSeconds: number
  interfaceLanguage: InterfaceLanguageSetting
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

export type AppState = 'idle' | 'loading-model' | 'downloading-model' | 'recording' | 'transcribing' | 'error'

export type HandsFreeMode = 'off' | 'ready' | 'standby'

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
  language: InterfaceLanguage
}

export const IpcChannel = {
  ToggleDictation: 'dictation:toggle',
  RecordingStopped: 'recorder:recording-stopped',
  RecordingError: 'recorder:recording-error',
  AudioLevel: 'recorder:audio-level',
  OverlayState: 'overlay:state',
  OverlayConfig: 'overlay:config',
  ModelDownloadProgress: 'overlay:model-download-progress',
  GetSettings: 'settings:get',
  SetSettings: 'settings:set',
  GetDictionary: 'dictionary:get',
  SetDictionary: 'dictionary:set',
  GetShortcuts: 'shortcuts:get',
  SetShortcuts: 'shortcuts:set',
  IsPackaged: 'app:is-packaged',
  GetAppVersion: 'app:get-version',
  GetInstalledModels: 'models:get-installed',
  GetHistory: 'history:get',
  UpdateHistoryText: 'history:update-text',
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
  GetHandsFreeStatus: 'hands-free:get-status',
  GetInterfaceLanguage: 'app:get-interface-language'
} as const
