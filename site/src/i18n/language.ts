export type Language = 'fr' | 'en'

const STORAGE_KEY = 'murmur-language'
const LANGUAGE_EVENT = 'murmur:language'

let currentLanguage: Language = 'fr'

function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'fr' || stored === 'en' ? stored : null
  } catch {
    return null
  }
}

function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    return
  }
}

export function detectLanguage(): Language {
  const stored = readStoredLanguage()
  if (stored) {
    return stored
  }
  const preferred = navigator.languages.find((tag) => /^(fr|en)\b/i.test(tag)) ?? navigator.language
  return preferred.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function getLanguage(): Language {
  return currentLanguage
}

export function setLanguage(language: Language, remember: boolean): void {
  currentLanguage = language
  if (remember) {
    storeLanguage(language)
  }
  document.documentElement.lang = language
  document.dispatchEvent(new CustomEvent(LANGUAGE_EVENT))
}

export function onLanguageChange(listener: () => void): void {
  document.addEventListener(LANGUAGE_EVENT, listener)
}
