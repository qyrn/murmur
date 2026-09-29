const CHIME_NOTES_HZ = [660, 990]
const NOTE_SPACING_SECONDS = 0.09
const NOTE_DURATION_SECONDS = 0.14
const PEAK_GAIN = 0.07

export function playWakeChime(): void {
  const context = new AudioContext()
  CHIME_NOTES_HZ.forEach((frequency, index) => {
    const startAt = context.currentTime + index * NOTE_SPACING_SECONDS
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + NOTE_DURATION_SECONDS)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + NOTE_DURATION_SECONDS)
  })
  const totalMs = (CHIME_NOTES_HZ.length * NOTE_SPACING_SECONDS + NOTE_DURATION_SECONDS) * 1000
  setTimeout(() => void context.close(), totalMs + 200)
}
