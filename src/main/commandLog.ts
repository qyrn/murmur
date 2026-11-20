import { isArrayOfObjects, readJsonFile, writeJsonFile } from './jsonFileStore'

export interface VoiceCommandAttempt {
  timestamp: number
  command: 'start' | 'stop'
  heard: string
  recognized: boolean
  voiceAboveNoiseDb: number | null
}

const MAX_ENTRIES = 500
const COMMAND_LOG_FILE = 'voice-commands.json'

export function recordCommandAttempt(attempt: VoiceCommandAttempt): void {
  const attempts = readJsonFile<VoiceCommandAttempt[]>(COMMAND_LOG_FILE, [], isArrayOfObjects)
  writeJsonFile(COMMAND_LOG_FILE, [...attempts, attempt].slice(-MAX_ENTRIES))
}
