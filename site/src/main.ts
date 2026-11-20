import { setupDesktopDemo } from './desktopDemo'
import { prefersReducedMotion, requireElement } from './dom'
import { setupHandsFreeTrack } from './handsFreeTrack'
import { setupInstallSection } from './installTabs'
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

if (!prefersReducedMotion()) {
  playVoiceHeadline(requireElement<HTMLElement>('#hero-title'))
  playWhenVisible(requireElement<HTMLElement>('#footer-mark'), FOOTER_MARK_WIDTH)
}
setupDesktopDemo()
setupShortcutPlayground()
setupHandsFreeTrack()
setupInstallSection()
