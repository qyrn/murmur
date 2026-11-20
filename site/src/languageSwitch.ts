import { requireElement } from './dom'
import { getLanguage, onLanguageChange, setLanguage } from './i18n/language'
import { runtimeText } from './i18n/runtimeText'

export function setupLanguageSwitch(): void {
  const button = requireElement<HTMLButtonElement>('#language-switch')
  const render = (): void => {
    button.textContent = runtimeText('language.switchTo')
    button.lang = getLanguage() === 'fr' ? 'en' : 'fr'
  }
  button.addEventListener('click', () => setLanguage(getLanguage() === 'fr' ? 'en' : 'fr', true))
  onLanguageChange(render)
  render()
}
