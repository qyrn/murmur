import { setupDesktopDemo } from './desktopDemo'
import { prefersReducedMotion, requireElement } from './dom'
import { setupHandsFreeTrack } from './handsFreeTrack'
import { playHeroPill } from './heroPill'
import { detectLanguage, onLanguageChange, setLanguage } from './i18n/language'
import { snapshotFrenchPage, translatePage } from './i18n/translatePage'
import { setupInstallSection } from './installTabs'
import { setupLanguageSwitch } from './languageSwitch'
import { setupShortcutPlayground } from './shortcutPlayground'
import { playVoiceHeadline } from './voiceHeadline'

const FOOTER_MARK_WIDTH = 150

function playWhenVisible(element: HTMLElement, restWidth: number): void {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        observer.disconnect()
        playVoiceHeadline(element, restWidth)
      }
    },
    { threshold: 0.6 }
  )
  observer.observe(element)
}

snapshotFrenchPage()
onLanguageChange(translatePage)
setupLanguageSwitch()
setupDesktopDemo()
setupShortcutPlayground()
setupHandsFreeTrack()
setupInstallSection()
setLanguage(detectLanguage(), false)

if (!prefersReducedMotion()) {
  playVoiceHeadline(requireElement<HTMLElement>('#hero-title'))
  playHeroPill()
  playWhenVisible(requireElement<HTMLElement>('#footer-mark'), FOOTER_MARK_WIDTH)
}
