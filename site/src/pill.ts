export type PillState = 'idle' | 'recording' | 'transcribing'

const BAR_SHAPE = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45]
const QUIET_LEVEL = 0.08
const SMOOTHING = 0.5

export interface Pill {
  setState(state: PillState): void
  showLevel(level: number): void
}

export function createPill(element: HTMLElement): Pill {
  const barContainer = element.querySelector<HTMLElement>('.bars')
  const bars = BAR_SHAPE.map(() => {
    const bar = document.createElement('span')
    bar.className = 'bar'
    barContainer?.append(bar)
    return bar
  })
  const displayed = BAR_SHAPE.map(() => QUIET_LEVEL)

  const render = (): void => {
    bars.forEach((bar, index) => bar.style.setProperty('--level', (displayed[index] ?? QUIET_LEVEL).toFixed(3)))
  }

  return {
    setState: (state) => {
      element.className = `pill state-${state}`
      if (state !== 'recording') {
        displayed.fill(QUIET_LEVEL)
        render()
      }
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
