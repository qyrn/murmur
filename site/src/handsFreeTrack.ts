import { requireElement } from './dom'

function waveHeight(index: number, count: number): number {
  const envelope = Math.sin(((index + 0.5) / count) * Math.PI)
  const syllable = 0.55 + 0.45 * Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.6))
  return Math.max(0.12, envelope * syllable)
}

function drawWave(container: HTMLElement): void {
  const count = Number(container.dataset.wave ?? '0')
  for (let index = 0; index < count; index += 1) {
    const bar = document.createElement('span')
    bar.style.setProperty('--level', waveHeight(index, count).toFixed(2))
    container.append(bar)
  }
}

export function setupHandsFreeTrack(): void {
  const track = requireElement<HTMLOListElement>('#track')
  track.querySelectorAll<HTMLElement>('[data-wave]').forEach(drawWave)
  new IntersectionObserver(
    ([entry]) => track.classList.toggle('is-playing', entry?.isIntersecting ?? false),
    { threshold: 0.5 }
  ).observe(track)
}
