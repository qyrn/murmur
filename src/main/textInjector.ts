import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { clipboard } from 'electron'
import { getActiveWindow } from './activeWindow'

const execFileAsync = promisify(execFile)

const CLIPBOARD_SETTLE_MS = 50
const CLIPBOARD_RESTORE_DELAY_MS = 1500

const LINUX_KEYCODE_LEFT_CTRL = 29
const LINUX_KEYCODE_LEFT_SHIFT = 42
const LINUX_KEYCODE_V = 47

const TERMINAL_WINDOW_CLASSES: ReadonlySet<string> = new Set([
  'org.kde.konsole',
  'konsole',
  'org.kde.yakuake',
  'alacritty',
  'Alacritty',
  'kitty',
  'foot',
  'org.wezfurlong.wezterm',
  'com.mitchellh.ghostty',
  'org.gnome.Terminal',
  'org.gnome.Ptyxis'
])

const wait = (ms: number): Promise<void> => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))

async function pasteOnWindows(text: string): Promise<void> {
  const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
  keyboard.config.autoDelayMs = 0
  const previousClipboard = await clipboard.readText()

  await clipboard.writeText(text)
  await wait(CLIPBOARD_SETTLE_MS)

  await keyboard.pressKey(Key.LeftControl, Key.V)
  await keyboard.releaseKey(Key.LeftControl, Key.V)

  await wait(CLIPBOARD_RESTORE_DELAY_MS)
  await clipboard.writeText(previousClipboard)
}

async function readWaylandClipboard(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('wl-paste', ['--no-newline', '--type', 'text/plain'])
    return stdout
  } catch {
    return null
  }
}

function writeWaylandClipboard(text: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn('wl-copy', ['--type', 'text/plain'], { stdio: ['pipe', 'ignore', 'ignore'] })
    proc.on('error', rejectPromise)
    proc.on('exit', (code) => {
      if (code === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`wl-copy a échoué (code ${code})`))
      }
    })
    proc.stdin.end(text)
  })
}

function pasteKeySequence(useTerminalShortcut: boolean): string[] {
  const modifiers = useTerminalShortcut ? [LINUX_KEYCODE_LEFT_CTRL, LINUX_KEYCODE_LEFT_SHIFT] : [LINUX_KEYCODE_LEFT_CTRL]
  const keys = [...modifiers, LINUX_KEYCODE_V]
  return [...keys.map((code) => `${code}:1`), ...keys.reverse().map((code) => `${code}:0`)]
}

async function pasteOnLinux(text: string): Promise<void> {
  const previousClipboard = await readWaylandClipboard()
  const activeWindow = await getActiveWindow()
  const useTerminalShortcut = activeWindow !== undefined && TERMINAL_WINDOW_CLASSES.has(activeWindow.windowClass)

  await writeWaylandClipboard(text)
  await wait(CLIPBOARD_SETTLE_MS)

  await execFileAsync('ydotool', ['key', ...pasteKeySequence(useTerminalShortcut)])

  if (previousClipboard !== null) {
    await wait(CLIPBOARD_RESTORE_DELAY_MS)
    await writeWaylandClipboard(previousClipboard)
  }
}

export function pasteIntoActiveWindow(text: string): Promise<void> {
  return process.platform === 'win32' ? pasteOnWindows(text) : pasteOnLinux(text)
}
