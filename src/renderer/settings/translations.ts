import { isMessageKey, translate, type MessageKey } from '../../shared/messages'
import type { InterfaceLanguage } from '../../shared/types'

let currentLanguage: InterfaceLanguage = 'fr'

export function setLanguage(language: InterfaceLanguage): void {
  currentLanguage = language
  document.documentElement.lang = language
}

export function t(key: MessageKey, values: Record<string, string> = {}): string {
  return translate(currentLanguage, key, values)
}

export function translateStaticText(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset['i18n'] ?? ''
    if (isMessageKey(key)) {
      element.textContent = t(key)
    }
  })
  document.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((element) => {
    const key = element.dataset['i18nLabel'] ?? ''
    if (isMessageKey(key)) {
      element.setAttribute('aria-label', t(key))
      element.title = t(key)
    }
  })
}
