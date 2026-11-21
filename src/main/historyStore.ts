import type { DictationRecord } from '../shared/types'
import { isArrayOfObjects, readJsonFile, writeJsonFile } from './jsonFileStore'

const MAX_ENTRIES = 500
const HISTORY_FILE = 'history.json'

export function loadHistory(): DictationRecord[] {
  return readJsonFile<DictationRecord[]>(HISTORY_FILE, [], isArrayOfObjects)
}

export function appendHistoryEntry(entry: DictationRecord): void {
  writeJsonFile(HISTORY_FILE, [...loadHistory(), entry].slice(-MAX_ENTRIES))
}

export function updateHistoryText(timestamp: number, text: string): void {
  writeJsonFile(
    HISTORY_FILE,
    loadHistory().map((entry) =>
      entry.timestamp === timestamp ? { ...entry, text, wordCount: text.split(/\s+/).filter(Boolean).length } : entry
    )
  )
}
