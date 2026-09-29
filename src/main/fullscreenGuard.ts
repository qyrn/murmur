import { screen, type Rectangle } from 'electron'
import { activeWindow } from 'get-windows'

const POLL_INTERVAL_MS = 1000
const EDGE_TOLERANCE_PX = 2
const DESKTOP_SHELL_EXECUTABLE = 'explorer.exe'

function coversDisplay(windowBounds: Rectangle): boolean {
  const displayBounds = screen.getDisplayMatching(windowBounds).bounds
  return (
    windowBounds.x <= displayBounds.x + EDGE_TOLERANCE_PX &&
    windowBounds.y <= displayBounds.y + EDGE_TOLERANCE_PX &&
    windowBounds.x + windowBounds.width >= displayBounds.x + displayBounds.width - EDGE_TOLERANCE_PX &&
    windowBounds.y + windowBounds.height >= displayBounds.y + displayBounds.height - EDGE_TOLERANCE_PX
  )
}

async function isFullscreenAppActive(): Promise<boolean> {
  const window = await activeWindow().catch(() => undefined)
  if (!window || window.platform !== 'windows') {
    return false
  }
  if (window.owner.processId === process.pid || window.owner.path.toLowerCase().endsWith(DESKTOP_SHELL_EXECUTABLE)) {
    return false
  }
  return coversDisplay(screen.screenToDipRect(null, window.bounds))
}

export function watchFullscreenApps(onChange: (fullscreenAppActive: boolean) => void): void {
  let lastState = false
  setInterval(() => {
    void isFullscreenAppActive().then((fullscreenAppActive) => {
      if (fullscreenAppActive !== lastState) {
        lastState = fullscreenAppActive
        onChange(fullscreenAppActive)
      }
    })
  }, POLL_INTERVAL_MS)
}
