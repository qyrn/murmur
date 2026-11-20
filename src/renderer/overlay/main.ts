const pill = document.querySelector<HTMLDivElement>('#pill')!
const counter = document.querySelector<HTMLSpanElement>('#counter')!
const bars = Array.from(document.querySelectorAll<HTMLSpanElement>('.bar'))

const BAR_SHAPE = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45]
const QUIET_LEVEL = 0.08
const COUNTER_REFRESH_MS = 250
const displayed = new Array<number>(bars.length).fill(QUIET_LEVEL)
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

function resetBars(): void {
  displayed.fill(QUIET_LEVEL)
  bars.forEach((bar) => bar.style.setProperty('--h', String(QUIET_LEVEL)))
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
})

window.overlayApi.onAudioLevel((level) => {
  const clamped = Math.max(0, Math.min(1, level))
  bars.forEach((bar, index) => {
    const target = Math.max(QUIET_LEVEL, Math.min(1, clamped * (BAR_SHAPE[index] ?? 1)))
    const current = displayed[index] ?? QUIET_LEVEL
    displayed[index] = current + (target - current) * 0.5
    bar.style.setProperty('--h', String(displayed[index]))
  })
})
