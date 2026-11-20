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
