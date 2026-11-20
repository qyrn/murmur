interface DemoScene {
  appName: string
  spoken: string
  written: string
}

const SCENES: readonly DemoScene[] = [
  {
    appName: 'Discord',
    spoken: 'faut que je update le README avant la deadline',
    written: 'Faut que je update le README avant la deadline.'
  },
  {
    appName: 'Terminal',
    spoken: 'slash usage',
    written: '/usage'
  },
  {
    appName: 'Mail',
    spoken: "tu peux check la pull request quand t'as deux minutes",
    written: "Tu peux check la pull request quand t'as deux minutes ?"
  }
]

const BAR_SHAPE = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45]
const WORD_INTERVAL_MS = 260

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Élément introuvable : ${selector}`)
  }
  return element
}

const appLabel = requireElement<HTMLSpanElement>('#demo-app')
const field = requireElement<HTMLSpanElement>('#demo-text')
const spokenLine = requireElement<HTMLParagraphElement>('#demo-spoken')
const pill = requireElement<HTMLDivElement>('#demo-pill')
const bars = Array.from(pill.querySelectorAll<HTMLSpanElement>('.bar'))

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function setPillState(state: 'idle' | 'recording' | 'transcribing'): void {
  pill.className = `pill state-${state}`
}

function setBarLevels(voiceLevel: number): void {
  bars.forEach((bar, index) => {
    const jitter = 0.65 + Math.random() * 0.35
    const level = Math.max(0.08, Math.min(1, voiceLevel * (BAR_SHAPE[index] ?? 1) * jitter))
    bar.style.setProperty('--level', level.toFixed(2))
  })
}

async function speak(words: string[]): Promise<void> {
  const levelTimer = setInterval(() => setBarLevels(0.55 + Math.random() * 0.45), 110)
  for (let index = 0; index < words.length; index += 1) {
    spokenLine.textContent = `« ${words.slice(0, index + 1).join(' ')} »`
    await wait(WORD_INTERVAL_MS)
  }
  clearInterval(levelTimer)
  setBarLevels(0)
}

async function playScene(scene: DemoScene): Promise<void> {
  appLabel.textContent = scene.appName
  field.textContent = ''
  spokenLine.textContent = ''
  await wait(900)
  setPillState('recording')
  await wait(350)
  await speak(scene.spoken.split(' '))
  await wait(300)
  setPillState('transcribing')
  await wait(650)
  setPillState('idle')
  field.textContent = `${scene.written} `
  await wait(2600)
}

function showStaticScene(scene: DemoScene): void {
  appLabel.textContent = scene.appName
  spokenLine.textContent = `« ${scene.spoken} »`
  field.textContent = scene.written
}

async function playDemo(): Promise<void> {
  for (;;) {
    for (const scene of SCENES) {
      await playScene(scene)
    }
  }
}

const [firstScene] = SCENES
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if (firstScene) {
    showStaticScene(firstScene)
  }
} else {
  void playDemo()
}
