import type { Rectangle } from 'electron'
import { getActiveWindow } from './activeWindow'
import { displayBoundsContaining } from './displayGeometry'

const POLL_INTERVAL_MS = 1000
const EDGE_TOLERANCE_PX = 2

function coversDisplay(windowBounds: Rectangle): boolean {
  const displayBounds = displayBoundsContaining(windowBounds)
  return (
    windowBounds.x <= displayBounds.x + EDGE_TOLERANCE_PX &&
    windowBounds.y <= displayBounds.y + EDGE_TOLERANCE_PX &&
    windowBounds.x + windowBounds.width >= displayBounds.x + displayBounds.width - EDGE_TOLERANCE_PX &&
    windowBounds.y + windowBounds.height >= displayBounds.y + displayBounds.height - EDGE_TOLERANCE_PX
  )
}

async function isFullscreenAppActive(): Promise<boolean> {
  const window = await getActiveWindow()
  if (!window || window.processId === process.pid || window.isDesktopShell) {
    return false
  }
  return coversDisplay(window.bounds)
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
