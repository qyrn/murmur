export type WhisperModel = 'large-v3-turbo' | 'large-v3'

export interface DictationSettings {
  hotkey: string
  model: WhisperModel
  autoPaste: boolean
  microphoneDeviceId: string | null
}

export interface DictionaryEntry {
  term: string
  note: string
}

export type AppState = 'idle' | 'loading-model' | 'recording' | 'transcribing' | 'error'

export interface RecorderToMainMessage {
  audio: ArrayBuffer
}

export const IpcChannel = {
  ToggleDictation: 'dictation:toggle',
  StateChanged: 'dictation:state-changed',
  RecordingStopped: 'recorder:recording-stopped',
  GetSettings: 'settings:get',
  SetSettings: 'settings:set',
  GetDictionary: 'dictionary:get',
  SetDictionary: 'dictionary:set',
  GetMicrophones: 'settings:get-microphones'
} as const
