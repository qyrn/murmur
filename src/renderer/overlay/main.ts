const pill = document.querySelector<HTMLDivElement>('#pill')!
const bars = Array.from(document.querySelectorAll<HTMLSpanElement>('.bar'))

const BAR_SHAPE = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45]
const displayed = new Array(bars.length).fill(0.08)

window.overlayApi.onStateChange((state) => {
  pill.className = `pill state-${state}`
  if (state !== 'recording') {
    displayed.fill(0.08)
    bars.forEach((bar) => bar.style.setProperty('--h', '0.08'))
  }
})

window.overlayApi.onAudioLevel((level) => {
  const clamped = Math.max(0, Math.min(1, level))
  bars.forEach((bar, index) => {
    const target = Math.max(0.08, Math.min(1, clamped * (BAR_SHAPE[index] ?? 1)))
    displayed[index] = (displayed[index] ?? 0.08) + (target - (displayed[index] ?? 0.08)) * 0.5
    bar.style.setProperty('--h', displayed[index].toString())
  })
})
