import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { screen, type Rectangle } from 'electron'

const execFileAsync = promisify(execFile)

const WINDOWS_DESKTOP_SHELL_EXECUTABLE = 'explorer.exe'
const KDE_DESKTOP_SHELL_CLASS = 'plasmashell'

export interface ActiveWindowInfo {
  appName: string
  windowClass: string
  processId: number
  bounds: Rectangle
  isDesktopShell: boolean
}

async function readWindowsActiveWindow(): Promise<ActiveWindowInfo | undefined> {
  const { activeWindow } = await import('get-windows')
  const window = await activeWindow()
  if (!window || window.platform !== 'windows') {
    return undefined
  }
  return {
    appName: window.owner.name,
    windowClass: window.owner.name,
    processId: window.owner.processId,
    bounds: screen.screenToDipRect(null, window.bounds),
    isDesktopShell: window.owner.path.toLowerCase().endsWith(WINDOWS_DESKTOP_SHELL_EXECUTABLE)
  }
}

function desktopEntryDirectories(): string[] {
  const dataHome = process.env['XDG_DATA_HOME'] ?? join(homedir(), '.local/share')
  const dataDirs = (process.env['XDG_DATA_DIRS'] ?? '/usr/local/share:/usr/share').split(':')
  return [dataHome, ...dataDirs].map((dir) => join(dir, 'applications'))
}

const appNameCache = new Map<string, string>()

function friendlyAppName(windowClass: string): string {
  const cached = appNameCache.get(windowClass)
  if (cached) {
    return cached
  }
  let appName = windowClass
  for (const dir of desktopEntryDirectories()) {
    const entryPath = join(dir, `${windowClass}.desktop`)
    if (existsSync(entryPath)) {
      const nameLine = readFileSync(entryPath, 'utf-8').match(/^Name=(.+)$/m)
      if (nameLine?.[1]) {
        appName = nameLine[1].trim()
        break
      }
    }
  }
  appNameCache.set(windowClass, appName)
  return appName
}

function parseKdotoolOutput(output: string): ActiveWindowInfo | undefined {
  const [windowClass, pidLine] = output.split('\n').map((line) => line.trim())
  const position = output.match(/Position:\s*(-?[\d.]+),(-?[\d.]+)/)
  const geometry = output.match(/Geometry:\s*([\d.]+)x([\d.]+)/)
  if (!windowClass || !pidLine || !position || !geometry) {
    return undefined
  }
  return {
    appName: friendlyAppName(windowClass),
    windowClass,
    processId: Number(pidLine),
    bounds: {
      x: Math.round(Number(position[1])),
      y: Math.round(Number(position[2])),
      width: Math.round(Number(geometry[1])),
      height: Math.round(Number(geometry[2]))
    },
    isDesktopShell: windowClass === KDE_DESKTOP_SHELL_CLASS
  }
}

async function readKdeActiveWindow(): Promise<ActiveWindowInfo | undefined> {
  const { stdout } = await execFileAsync('kdotool', [
    'getactivewindow',
    'getwindowclassname',
    'getwindowpid',
    'getwindowgeometry'
  ])
  return parseKdotoolOutput(stdout)
}

export function getActiveWindow(): Promise<ActiveWindowInfo | undefined> {
  const reader = process.platform === 'win32' ? readWindowsActiveWindow : readKdeActiveWindow
  return reader().catch(() => undefined)
}
