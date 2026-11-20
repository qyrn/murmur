export type PillState = 'idle' | 'recording' | 'transcribing'

const BAR_SHAPE = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45]
const QUIET_LEVEL = 0.08
const SMOOTHING = 0.5
const COUNTER_REFRESH_MS = 250

export interface Pill {
  setState(state: PillState): void
  showLevel(level: number): void
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function createPill(element: HTMLElement): Pill {
  const barContainer = element.querySelector<HTMLElement>('.bars')
  const counter = element.querySelector<HTMLElement>('.counter')
  const bars = BAR_SHAPE.map(() => {
    const bar = document.createElement('span')
    bar.className = 'bar'
    barContainer?.append(bar)
    return bar
  })
  const displayed = BAR_SHAPE.map(() => QUIET_LEVEL)
  let counterTimer: number | undefined

  const render = (): void => {
    bars.forEach((bar, index) => bar.style.setProperty('--level', (displayed[index] ?? QUIET_LEVEL).toFixed(3)))
  }

  const startCounter = (): void => {
    const startedAt = Date.now()
    const refresh = (): void => {
      if (counter) {
        counter.textContent = formatElapsed(Date.now() - startedAt)
      }
    }
    refresh()
    window.clearInterval(counterTimer)
    counterTimer = window.setInterval(refresh, COUNTER_REFRESH_MS)
  }

  return {
    setState: (state) => {
      element.className = element.className.replace(/state-\S+/, `state-${state}`)
      if (state === 'recording') {
        startCounter()
        return
      }
      window.clearInterval(counterTimer)
      displayed.fill(QUIET_LEVEL)
      render()
    },
    showLevel: (level) => {
      BAR_SHAPE.forEach((shape, index) => {
        const target = Math.max(QUIET_LEVEL, Math.min(1, level * shape))
        const current = displayed[index] ?? QUIET_LEVEL
        displayed[index] = current + (target - current) * SMOOTHING
      })
      render()
    }
  }
}
