import { app } from 'electron'
import { translate, type MessageKey } from '../shared/messages'
import type { InterfaceLanguage, InterfaceLanguageSetting } from '../shared/types'

let currentLanguage: InterfaceLanguage = 'fr'

function systemLanguage(): InterfaceLanguage {
  const preferred = app.getPreferredSystemLanguages()[0] ?? app.getLocale()
  return preferred.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function applyInterfaceLanguage(setting: InterfaceLanguageSetting): void {
  currentLanguage = setting === 'auto' ? systemLanguage() : setting
}

export function interfaceLanguage(): InterfaceLanguage {
  return currentLanguage
}

export function t(key: MessageKey, values: Record<string, string> = {}): string {
  return translate(currentLanguage, key, values)
}
