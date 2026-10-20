import { app, screen, type Display, type Rectangle } from 'electron'

const runsOnXwayland =
  process.platform === 'linux' &&
  Boolean(process.env['WAYLAND_DISPLAY']) &&
  app.commandLine.getSwitchValue('ozone-platform') === 'x11'

function scaleRect(rect: Rectangle, factor: number): Rectangle {
  return {
    x: Math.round(rect.x * factor),
    y: Math.round(rect.y * factor),
    width: Math.round(rect.width * factor),
    height: Math.round(rect.height * factor)
  }
}

function xwaylandCorrection(display: Display): number {
  return runsOnXwayland ? display.scaleFactor : 1
}

export function primaryWorkArea(): Rectangle {
  return screen.getPrimaryDisplay().workArea
}

export function displayBoundsContaining(windowBounds: Rectangle): Rectangle {
  const primaryCorrection = xwaylandCorrection(screen.getPrimaryDisplay())
  const display = screen.getDisplayMatching(scaleRect(windowBounds, 1 / primaryCorrection))
  return scaleRect(display.bounds, xwaylandCorrection(display))
}
