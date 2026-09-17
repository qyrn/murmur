import type { DictionaryEntry } from '../shared/types'

export function buildInitialPrompt(entries: DictionaryEntry[]): string {
  if (entries.length === 0) {
    return 'Dictée en français, avec parfois des mots ou expressions en anglais conservés tels quels.'
  }
  const terms = entries.map((entry) => entry.term).join(', ')
  return `Dictée en français, avec parfois des mots ou expressions en anglais conservés tels quels, notamment : ${terms}.`
}

export function applyDictionaryCorrections(text: string, entries: DictionaryEntry[]): string {
  let result = text
  for (const entry of entries) {
    const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(pattern, entry.term)
  }
  return result
}
