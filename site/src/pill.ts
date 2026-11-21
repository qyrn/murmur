export type PillState = 'idle' | 'ready' | 'recording' | 'transcribing'

const BAR_COUNT = 11
const QUIET_LEVEL = 0.08
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
  const bars = Array.from({ length: BAR_COUNT }, () => {
    const bar = document.createElement('span')
    bar.className = 'bar'
    barContainer?.append(bar)
    return bar
  })
  const recentLevels = new Array<number>(BAR_COUNT).fill(QUIET_LEVEL)
  let counterTimer: number | undefined

  const render = (): void => {
    bars.forEach((bar, index) => bar.style.setProperty('--level', (recentLevels[index] ?? QUIET_LEVEL).toFixed(3)))
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
      recentLevels.fill(QUIET_LEVEL)
      render()
    },
    showLevel: (level) => {
      recentLevels.shift()
      recentLevels.push(Math.max(QUIET_LEVEL, Math.min(1, level)))
      render()
    }
  }
}
