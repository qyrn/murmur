import { requireElement } from './dom'
import { createPill } from './pill'
import { createSyntheticVoice } from './voiceLevel'
import { SPEAKING_MS, WRITING_MS } from './voiceHeadline'

const SETTLE_MS = 300

export function playHeroPill(): void {
  const pill = createPill(requireElement<HTMLElement>('#hero-pill'))
  const voice = createSyntheticVoice()
  const startedAt = performance.now()
  pill.setState('recording')

  const frame = (now: number): void => {
    if (now - startedAt < SPEAKING_MS) {
      pill.showLevel(voice.read())
      requestAnimationFrame(frame)
    }
  }
  requestAnimationFrame(frame)
  window.setTimeout(() => pill.setState('transcribing'), SPEAKING_MS)
  window.setTimeout(() => pill.setState('ready'), SPEAKING_MS + WRITING_MS + SETTLE_MS)
}
