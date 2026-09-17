const pill = document.querySelector<HTMLDivElement>('#pill')!
const bars = Array.from(document.querySelectorAll<HTMLSpanElement>('.bar'))

window.overlayApi.onStateChange((state) => {
  pill.className = `pill state-${state}`
})

window.overlayApi.onAudioLevel((level) => {
  const clamped = Math.max(0, Math.min(1, level))
  bars.forEach((bar, index) => {
    const jitter = Math.sin(Date.now() / 110 + index * 1.3) * 0.2
    const height = Math.max(0.1, Math.min(1, clamped * 1.6 + jitter))
    bar.style.setProperty('--h', height.toString())
  })
})
