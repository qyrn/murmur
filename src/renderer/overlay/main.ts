import { translate } from '../../shared/messages'

const pill = document.querySelector<HTMLDivElement>('#pill')!
const counter = document.querySelector<HTMLSpanElement>('#counter')!
const label = document.querySelector<HTMLSpanElement>('.label')!
const bars = Array.from(document.querySelectorAll<HTMLSpanElement>('.bar'))

const QUIET_LEVEL = 0.08
const COUNTER_REFRESH_MS = 250
const recentLevels = new Array<number>(bars.length).fill(QUIET_LEVEL)
let recordingStartedAt = 0
let counterTimer: number | undefined

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function refreshCounter(): void {
  counter.textContent = formatElapsed(Date.now() - recordingStartedAt)
}

function startCounter(): void {
  recordingStartedAt = Date.now()
  refreshCounter()
  window.clearInterval(counterTimer)
  counterTimer = window.setInterval(refreshCounter, COUNTER_REFRESH_MS)
}

function stopCounter(): void {
  window.clearInterval(counterTimer)
  counterTimer = undefined
}

function renderBars(): void {
  bars.forEach((bar, index) => bar.style.setProperty('--h', String(recentLevels[index] ?? QUIET_LEVEL)))
}

function resetBars(): void {
  recentLevels.fill(QUIET_LEVEL)
  renderBars()
}

window.overlayApi.onStateChange((state) => {
  pill.className = `pill state-${state}`
  if (state === 'recording') {
    startCounter()
  } else {
    stopCounter()
    resetBars()
  }
})

window.overlayApi.onConfig((config) => {
  document.documentElement.style.setProperty('--screen-ink', config.accentColor)
  document.documentElement.classList.toggle('waveform-off', !config.showWaveform)
  document.documentElement.lang = config.language
  label.dataset['transcribing'] = translate(config.language, 'overlay.transcribing')
  label.dataset['loading'] = translate(config.language, 'overlay.loading')
  label.dataset['error'] = translate(config.language, 'overlay.error')
})

window.overlayApi.onAudioLevel((level) => {
  recentLevels.shift()
  recentLevels.push(Math.max(QUIET_LEVEL, Math.min(1, level)))
  renderBars()
})
