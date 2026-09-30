export interface CommandWindow {
  samples: Float32Array
  seconds: number
  takenAt: number
}

export interface CommandChecker {
  submit: (window: CommandWindow) => void
  reset: () => void
}

export function createCommandChecker(
  check: (window: CommandWindow) => Promise<boolean>,
  onMatch: (window: CommandWindow) => void
): CommandChecker {
  let inFlight = false
  let pending: CommandWindow | null = null

  async function drain(first: CommandWindow): Promise<void> {
    inFlight = true
    let current: CommandWindow | null = first
    try {
      while (current) {
        pending = null
        const matched = await check(current).catch(() => false)
        if (matched) {
          onMatch(current)
          pending = null
          return
        }
        current = pending
      }
    } finally {
      inFlight = false
    }
  }

  return {
    submit: (window) => {
      if (inFlight) {
        pending = window
        return
      }
      void drain(window)
    },
    reset: () => {
      pending = null
    }
  }
}
