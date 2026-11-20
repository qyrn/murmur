const SPEAKING_MS = 1500
const WRITING_MS = 1100
const NARROWEST_WIDTH = 52

interface VoiceLetter {
  element: HTMLSpanElement
  writtenAt: number
}

function splitIntoLetters(line: HTMLElement): HTMLSpanElement[] {
  const words = (line.textContent ?? '').trim().split(/\s+/)
  line.textContent = ''
  const letters: HTMLSpanElement[] = []
  words.forEach((word, wordIndex) => {
    const wordElement = document.createElement('span')
    wordElement.className = 'voice-word'
    for (const character of word) {
      const letter = document.createElement('span')
      letter.className = 'voice-letter'
      letter.textContent = character
      wordElement.append(letter)
      letters.push(letter)
    }
    line.append(wordElement)
    if (wordIndex < words.length - 1) {
      line.append(' ')
    }
  })
  return letters
}

function voiceLevelAt(letterIndex: number, elapsed: number): number {
  const envelope = Math.min(1, elapsed / 250)
  const syllable = 0.5 + 0.5 * Math.sin(letterIndex * 0.62 - elapsed * 0.011)
  const breath = 0.6 + 0.4 * Math.sin(letterIndex * 0.21 + elapsed * 0.004)
  return envelope * syllable * breath
}

function applyLevel(letter: HTMLSpanElement, level: number, restWidth: number): void {
  letter.style.setProperty('--wdth', (restWidth - (restWidth - NARROWEST_WIDTH) * level).toFixed(1))
  letter.style.setProperty('--wght', (620 + 280 * level).toFixed(0))
}

function settle(letter: HTMLSpanElement): void {
  letter.style.removeProperty('--wdth')
  letter.style.removeProperty('--wght')
  letter.classList.add('is-written')
}

export function playVoiceHeadline(headline: HTMLElement, restWidth = 100): void {
  const lines = Array.from(headline.querySelectorAll<HTMLElement>('.voice-line'))
  const letters: VoiceLetter[] = lines.flatMap(splitIntoLetters).map((element, index, all) => ({
    element,
    writtenAt: SPEAKING_MS + (index / all.length) * WRITING_MS
  }))
  headline.classList.add('is-speaking')
  const startedAt = performance.now()

  const frame = (now: number): void => {
    const elapsed = now - startedAt
    let pending = 0
    letters.forEach((letter, index) => {
      if (letter.element.classList.contains('is-written')) {
        return
      }
      if (elapsed >= letter.writtenAt) {
        settle(letter.element)
        return
      }
      pending += 1
      applyLevel(letter.element, voiceLevelAt(index, elapsed), restWidth)
    })
    if (pending > 0) {
      requestAnimationFrame(frame)
    } else {
      headline.classList.remove('is-speaking')
    }
  }
  requestAnimationFrame(frame)
}
