import { execFile, execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { promisify } from 'node:util'
import { globalShortcut } from 'electron'

const execFileAsync = promisify(execFile)

const KDE_COMPONENT = 'murmur'
const KDE_TOGGLE_ACTION = 'toggle-dictation'
const KDE_ACTION_ID = [KDE_COMPONENT, KDE_TOGGLE_ACTION, 'murmur', 'Démarrer / arrêter la dictée']
const KGLOBALACCEL_SET_PRESENT = 2
const KGLOBALACCEL_NO_AUTOLOADING = 4
const KGLOBALACCEL_FLAGS = String(KGLOBALACCEL_SET_PRESENT | KGLOBALACCEL_NO_AUTOLOADING)
const EMPTY_KEY_LIST = '@a(ai) []'

const QT_MODIFIERS: Readonly<Record<string, number>> = {
  shift: 0x02000000,
  control: 0x04000000,
  ctrl: 0x04000000,
  commandorcontrol: 0x04000000,
  cmdorctrl: 0x04000000,
  command: 0x04000000,
  cmd: 0x04000000,
  alt: 0x08000000,
  option: 0x08000000,
  altgr: 0x08000000,
  super: 0x10000000,
  meta: 0x10000000
}

const QT_NAMED_KEYS: Readonly<Record<string, number>> = {
  space: 0x20,
  plus: 0x2b,
  escape: 0x01000000,
  esc: 0x01000000,
  tab: 0x01000001,
  backspace: 0x01000003,
  return: 0x01000004,
  enter: 0x01000004,
  insert: 0x01000006,
  delete: 0x01000007,
  pause: 0x01000008,
  printscreen: 0x01000009,
  home: 0x01000010,
  end: 0x01000011,
  left: 0x01000012,
  up: 0x01000013,
  right: 0x01000014,
  down: 0x01000015,
  pageup: 0x01000016,
  pagedown: 0x01000017
}

const QT_KEY_F1 = 0x01000030

function qtKeyCode(keyName: string): number | null {
  const normalized = keyName.toLowerCase()
  const namedKey = QT_NAMED_KEYS[normalized]
  if (namedKey !== undefined) {
    return namedKey
  }
  const functionKey = normalized.match(/^f(\d{1,2})$/)
  if (functionKey) {
    const index = Number(functionKey[1])
    return index >= 1 && index <= 24 ? QT_KEY_F1 + index - 1 : null
  }
  if (keyName.length === 1) {
    return keyName.toUpperCase().charCodeAt(0)
  }
  return null
}

export function toQtKeyCombination(accelerator: string): number | null {
  const parts = accelerator.split('+').map((part) => part.trim())
  const keyName = parts.pop()
  if (!keyName) {
    return null
  }
  let modifiers = 0
  for (const part of parts) {
    const modifier = QT_MODIFIERS[part.toLowerCase()]
    if (modifier === undefined) {
      return null
    }
    modifiers |= modifier
  }
  const keyCode = qtKeyCode(keyName)
  return keyCode === null ? null : modifiers | keyCode
}

function gvariantStringArray(values: string[]): string {
  const quoted = values.map((value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
  return `[${quoted.join(', ')}]`
}

function kglobalaccelArgs(method: string, args: string[]): string[] {
  return [
    'call',
    '--session',
    '--dest',
    'org.kde.kglobalaccel',
    '--object-path',
    '/kglobalaccel',
    '--method',
    `org.kde.KGlobalAccel.${method}`,
    ...args
  ]
}

async function callKGlobalAccel(method: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('gdbus', kglobalaccelArgs(method, args))
  return stdout
}

let kdePressMonitor: ChildProcessWithoutNullStreams | null = null
let kdePressHandler: (() => void) | null = null

function watchKdeShortcutPresses(): void {
  if (kdePressMonitor) {
    return
  }
  const monitor = spawn('gdbus', [
    'monitor',
    '--session',
    '--dest',
    'org.kde.kglobalaccel',
    '--object-path',
    `/component/${KDE_COMPONENT}`
  ])
  let pendingOutput = ''
  monitor.stdout.on('data', (chunk: Buffer) => {
    pendingOutput += chunk.toString()
    const lines = pendingOutput.split('\n')
    pendingOutput = lines.pop() ?? ''
    for (const line of lines) {
      if (line.includes('globalShortcutPressed') && line.includes(`'${KDE_TOGGLE_ACTION}'`)) {
        kdePressHandler?.()
      }
    }
  })
  monitor.on('exit', () => {
    kdePressMonitor = null
  })
  kdePressMonitor = monitor
}

async function registerKdeHotkey(accelerator: string, onPress: () => void): Promise<boolean> {
  const keyCombination = toQtKeyCombination(accelerator)
  if (keyCombination === null) {
    console.error(`[debug] raccourci ${accelerator} non reconnu`)
    return false
  }
  kdePressHandler = onPress
  const actionId = gvariantStringArray(KDE_ACTION_ID)
  await callKGlobalAccel('doRegister', actionId)
  watchKdeShortcutPresses()
  const assignedKeys = await callKGlobalAccel('setShortcutKeys', actionId, `[([${keyCombination}],)]`, KGLOBALACCEL_FLAGS)
  return assignedKeys.includes(String(keyCombination))
}

export async function registerGlobalHotkey(accelerator: string, onPress: () => void): Promise<boolean> {
  if (process.platform === 'win32') {
    globalShortcut.unregisterAll()
    return globalShortcut.register(accelerator, onPress)
  }
  return registerKdeHotkey(accelerator, onPress).catch((err: unknown) => {
    console.error('[debug] enregistrement du raccourci KDE impossible', err)
    return false
  })
}

export async function unregisterGlobalHotkey(): Promise<void> {
  if (process.platform === 'win32') {
    globalShortcut.unregisterAll()
    return
  }
  await callKGlobalAccel('setShortcutKeys', gvariantStringArray(KDE_ACTION_ID), EMPTY_KEY_LIST, KGLOBALACCEL_FLAGS).catch(
    (err: unknown) => console.error('[debug] libération du raccourci KDE impossible', err)
  )
}

export function releaseGlobalHotkeyOnQuit(): void {
  if (process.platform === 'win32') {
    globalShortcut.unregisterAll()
    return
  }
  kdePressMonitor?.kill()
  try {
    execFileSync(
      'gdbus',
      kglobalaccelArgs('setShortcutKeys', [gvariantStringArray(KDE_ACTION_ID), EMPTY_KEY_LIST, KGLOBALACCEL_FLAGS])
    )
  } catch (err) {
    console.error('[debug] libération du raccourci KDE impossible', err)
  }
}
