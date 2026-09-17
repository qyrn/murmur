const pill = document.querySelector<HTMLDivElement>('#pill')!
const bars = Array.from(document.querySelectorAll<HTMLSpanElement>('.bar'))

const HISTORY_LENGTH = 24
const BAR_STRIDE = 3
const levelHistory: number[] = new Array(HISTORY_LENGTH).fill(0)

window.overlayApi.onStateChange((state) => {
  pill.className = `pill state-${state}`
  if (state !== 'recording') {
    levelHistory.fill(0)
    bars.forEach((bar) => bar.style.setProperty('--h', '0.1'))
  }
})

window.overlayApi.onAudioLevel((level) => {
  const clamped = Math.max(0, Math.min(1, level))
  levelHistory.push(clamped)
  levelHistory.shift()

  bars.forEach((bar, index) => {
    const newestFirst = bars.length - 1 - index
    const historyIndex = HISTORY_LENGTH - 1 - newestFirst * BAR_STRIDE
    const current = levelHistory[historyIndex] ?? 0
    const previous = levelHistory[historyIndex - 1] ?? current
    const smoothed = (current + previous) / 2
    const height = Math.max(0.08, Math.min(1, smoothed))
    bar.style.setProperty('--h', height.toString())
  })
})
