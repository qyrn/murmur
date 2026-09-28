import type { DictionaryEntry, VoiceShortcut } from '../shared/types'

const BASE_PROMPT = 'Dictée en français, avec parfois des mots ou expressions en anglais conservés tels quels'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wholePhrasePattern(phrase: string, consumeTrailingSpace: boolean): RegExp {
  const words = phrase.trim().split(/\s+/).map(escapeRegex).join('\\s+')
  const trailing = consumeTrailingSpace ? '\\s*' : ''
  return new RegExp(`(?<![\\p{L}\\p{N}])${words}(?![\\p{L}\\p{N}])${trailing}`, 'giu')
}

function containsWordCharacter(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value)
}

export function buildInitialPrompt(entries: DictionaryEntry[], shortcuts: VoiceShortcut[]): string {
  const terms = [
    ...entries.map((entry) => entry.term),
    ...shortcuts.map((shortcut) => shortcut.written).filter(containsWordCharacter)
  ]
  const uniqueTerms = [...new Set(terms.map((term) => term.trim()).filter(Boolean))]
  if (uniqueTerms.length === 0) {
    return `${BASE_PROMPT}.`
  }
  return `${BASE_PROMPT}, notamment : ${uniqueTerms.join(', ')}.`
}

export function applyVoiceShortcuts(text: string, shortcuts: VoiceShortcut[]): string {
  let result = text
  for (const shortcut of shortcuts) {
    if (shortcut.spoken.trim().length === 0) {
      continue
    }
    const isSymbol = !containsWordCharacter(shortcut.written)
    result = result.replace(wholePhrasePattern(shortcut.spoken, isSymbol), shortcut.written)
  }
  return result
}

export function applyDictionaryCorrections(text: string, entries: DictionaryEntry[]): string {
  let result = text
  for (const entry of entries) {
    const hasMeaningfulCasing = entry.term !== entry.term.toLowerCase()
    if (entry.term.trim().length === 0 || !hasMeaningfulCasing) {
      continue
    }
    result = result.replace(wholePhrasePattern(entry.term, false), entry.term)
  }
  return result
}
