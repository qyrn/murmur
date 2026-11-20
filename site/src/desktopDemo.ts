import { requireElement, wait } from './dom'
import { createPill } from './pill'
import { createSyntheticVoice, openMicrophoneVoice, type VoiceLevelSource } from './voiceLevel'

const PHRASES_BY_APP: Record<string, readonly string[]> = {
  chat: [
    "Je l'ai testé ce matin, le build passe nickel chez moi.",
    'Je push le fix ce soir et je vous dis.',
    "Quelqu'un est chaud pour une game après ?"
  ],
  terminal: ['/usage', 'Corrige le bug du formulaire et lance les tests.', 'Commit et push tout ça.'],
  mail: [
    'Bonjour, je vous envoie le devis corrigé avant la deadline de vendredi.',
    "Je reste dispo si vous avez des questions, bonne journée !",
    'Merci pour votre retour rapide.'
  ]
}

const APP_NAMES: Record<string, string> = { chat: 'Discord', terminal: 'Terminal', mail: 'le mail' }
const AUTO_STOP_MS = 12000
const TRANSCRIBING_MS = 550
const MAX_TYPED_CHARACTERS = 200
const IDLE_STATUS = "La démo colle des phrases d'exemple, la vraie transcription se fait dans l'app."

type DemoPhase = 'idle' | 'recording' | 'transcribing'

export function setupDesktopDemo(): void {
  const section = requireElement<HTMLElement>('#essai')
  const desktop = requireElement<HTMLElement>('#desktop')
  const windows = Array.from(desktop.querySelectorAll<HTMLElement>('.window'))
  const pill = createPill(requireElement<HTMLElement>('#demo-pill'))
  const dictateButton = requireElement<HTMLButtonElement>('#dictate-button')
  const microphoneButton = requireElement<HTMLButtonElement>('#mic-button')
  const status = requireElement<HTMLParagraphElement>('#demo-status')

  let phase: DemoPhase = 'idle'
  let focusedWindow = windows[0]
  let microphone: VoiceLevelSource | null = null
  let activeVoice: VoiceLevelSource | null = null
  let levelFrame = 0
  let autoStopTimer = 0
  let sectionVisible = false
  const phraseIndexByApp = new Map<string, number>()

  const focusWindow = (target: HTMLElement): void => {
    focusedWindow = target
    windows.forEach((candidate) => candidate.classList.toggle('is-focused', candidate === target))
  }

  const nextPhrase = (app: string): string => {
    const phrases = PHRASES_BY_APP[app] ?? []
    const index = phraseIndexByApp.get(app) ?? 0
    phraseIndexByApp.set(app, index + 1)
    return phrases[index % phrases.length] ?? ''
  }

  const pasteInto = (target: HTMLElement): void => {
    const typed = requireElement<HTMLElement>('[data-typed]', target)
    const app = target.dataset.app ?? 'chat'
    const current = typed.textContent ?? ''
    const base = current.length > MAX_TYPED_CHARACTERS ? '' : current
    typed.textContent = `${base}${nextPhrase(app)} `
    status.textContent = `C'est collé dans ${APP_NAMES[app] ?? 'la fenêtre'}. Tu peux recommencer, ou cliquer dans une autre fenêtre.`
  }

  const animateLevels = (): void => {
    if (!activeVoice) {
      return
    }
    pill.showLevel(activeVoice.read())
    levelFrame = requestAnimationFrame(animateLevels)
  }

  const startRecording = (): void => {
    phase = 'recording'
    activeVoice = microphone ?? createSyntheticVoice()
    pill.setState('recording')
    dictateButton.setAttribute('aria-pressed', 'true')
    status.textContent = "murmur t'écoute… Réappuie pour coller le texte."
    levelFrame = requestAnimationFrame(animateLevels)
    autoStopTimer = window.setTimeout(() => void stopRecording(), AUTO_STOP_MS)
  }

  const stopRecording = async (): Promise<void> => {
    if (phase !== 'recording') {
      return
    }
    window.clearTimeout(autoStopTimer)
    cancelAnimationFrame(levelFrame)
    if (activeVoice !== microphone) {
      activeVoice?.stop()
    }
    activeVoice = null
    phase = 'transcribing'
    pill.setState('transcribing')
    dictateButton.setAttribute('aria-pressed', 'false')
    await wait(TRANSCRIBING_MS)
    pill.setState('idle')
    if (focusedWindow) {
      pasteInto(focusedWindow)
    }
    phase = 'idle'
  }

  const toggleDictation = (): void => {
    if (phase === 'idle') {
      startRecording()
    } else if (phase === 'recording') {
      void stopRecording()
    }
  }

  const toggleMicrophone = async (): Promise<void> => {
    if (microphone) {
      if (activeVoice === microphone) {
        activeVoice = createSyntheticVoice()
      }
      microphone.stop()
      microphone = null
      microphoneButton.setAttribute('aria-pressed', 'false')
      microphoneButton.textContent = 'Faire réagir la pastille à ma voix'
      status.textContent = IDLE_STATUS
      return
    }
    try {
      microphone = await openMicrophoneVoice()
      if (phase === 'recording') {
        activeVoice?.stop()
        activeVoice = microphone
      }
      microphoneButton.setAttribute('aria-pressed', 'true')
      microphoneButton.textContent = 'Couper mon micro'
      status.textContent = "Ton navigateur lit juste le volume pour faire bouger la pastille, rien n'est enregistré ni envoyé."
    } catch {
      status.textContent = "Pas d'accès au micro, du coup la pastille fait semblant. Tu peux l'autoriser dans ton navigateur."
    }
  }

  windows.forEach((candidate) => {
    candidate.addEventListener('pointerdown', () => focusWindow(candidate))
    candidate.addEventListener('focus', () => focusWindow(candidate))
  })
  dictateButton.addEventListener('click', toggleDictation)
  microphoneButton.addEventListener('click', () => void toggleMicrophone())

  new IntersectionObserver(
    ([entry]) => {
      sectionVisible = entry?.isIntersecting ?? false
    },
    { threshold: 0.35 }
  ).observe(section)

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.code === 'Space' && sectionVisible && !event.repeat) {
      event.preventDefault()
      toggleDictation()
    }
  })
}
