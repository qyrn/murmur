import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain, screen, session } from 'electron'
import { join } from 'node:path'
import { loadSettings, saveSettings, loadDictionary, saveDictionary } from './settingsStore'
import { ensureWhisperServer, stopWhisperServer } from './whisperServer'
import { transcribeAudio } from './transcribe'
import { pasteIntoActiveWindow } from './textInjector'
import { convertToWav16kMono } from './audioConvert'
import { IpcChannel, type AppState, type DictationSettings, type OverlayPosition } from '../shared/types'

process.on('uncaughtException', (err) => {
  console.error('[debug] uncaughtException', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[debug] unhandledRejection', err)
})
app.on('before-quit', () => {
  console.error('[debug] before-quit', new Error('stack').stack)
})
app.on('render-process-gone', (_event, contents, details) => {
  console.error('[debug] render-process-gone', contents.getURL(), details)
})
app.on('child-process-gone', (_event, details) => {
  console.error('[debug] child-process-gone', details)
})

let tray: Tray | null = null
let recorderWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let appState: AppState = 'idle'
let settings: DictationSettings = loadSettings()

const overlayVisibleStates: ReadonlySet<AppState> = new Set(['recording', 'transcribing', 'loading-model', 'error'])

const trayIconFor: Record<AppState, string> = {
  idle: 'idle.png',
  'loading-model': 'transcribing.png',
  recording: 'recording.png',
  transcribing: 'transcribing.png',
  error: 'error.png'
}

function trayIconPath(state: AppState): string {
  return join(__dirname, '../../resources/tray', trayIconFor[state])
}

function setAppState(state: AppState): void {
  console.log(`[debug] setAppState(${state})`)
  appState = state
  tray?.setImage(nativeImage.createFromPath(trayIconPath(state)))
  tray?.setToolTip(`murmur : ${state}`)
  overlayWindow?.webContents.send(IpcChannel.OverlayState, state)
  if (overlayVisibleStates.has(state)) {
    overlayWindow?.showInactive()
  } else {
    overlayWindow?.hide()
  }
}

function createRecorderWindow(): BrowserWindow {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/recorder.mjs'),
      sandbox: false
    }
  })
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[recorder] did-fail-load ${errorCode} ${errorDescription}`)
  })
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[recorder] render-process-gone', details)
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/recorder/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/recorder/index.html'))
  }
  return win
}

const OVERLAY_WIDTH = 220
const OVERLAY_HEIGHT = 64
const OVERLAY_MARGIN = 64

function overlayCoords(position: OverlayPosition): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay()
  const centerX = Math.round(workArea.x + (workArea.width - OVERLAY_WIDTH) / 2)
  switch (position) {
    case 'bottom-left':
      return { x: workArea.x + OVERLAY_MARGIN, y: workArea.y + workArea.height - OVERLAY_HEIGHT - OVERLAY_MARGIN }
    case 'bottom-right':
      return {
        x: workArea.x + workArea.width - OVERLAY_WIDTH - OVERLAY_MARGIN,
        y: workArea.y + workArea.height - OVERLAY_HEIGHT - OVERLAY_MARGIN
      }
    case 'top-center':
      return { x: centerX, y: workArea.y + OVERLAY_MARGIN }
    case 'bottom-center':
    default:
      return { x: centerX, y: workArea.y + workArea.height - OVERLAY_HEIGHT - OVERLAY_MARGIN }
  }
}

function pushOverlayConfig(): void {
  overlayWindow?.webContents.send(IpcChannel.OverlayConfig, {
    accentColor: settings.accentColor,
    showWaveform: settings.showWaveform
  })
}

function createOverlayWindow(): BrowserWindow {
  const { x, y } = overlayCoords(settings.overlayPosition)

  const win = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.mjs'),
      sandbox: false
    }
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true)
  win.webContents.on('did-finish-load', () => pushOverlayConfig())
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }
  return win
}

function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 640,
    height: 720,
    title: 'Réglages — murmur',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/settings.mjs'),
      sandbox: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings/index.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

async function toggleDictation(): Promise<void> {
  if (appState === 'idle') {
    try {
      setAppState('loading-model')
      await ensureWhisperServer(settings.model)
      setAppState('recording')
      recorderWindow?.webContents.send(IpcChannel.ToggleDictation, 'start')
    } catch (err) {
      console.error(err)
      setAppState('error')
      setTimeout(() => setAppState('idle'), 2000)
    }
    return
  }

  if (appState === 'recording') {
    recorderWindow?.webContents.send(IpcChannel.ToggleDictation, 'stop')
  }
}

async function handleRecordingStopped(audio: ArrayBuffer): Promise<void> {
  try {
    setAppState('transcribing')
    console.log(`[debug] audio recu du renderer : ${audio.byteLength} octets`)
    const wav = await convertToWav16kMono(Buffer.from(audio))
    console.log(`[debug] wav converti : ${wav.byteLength} octets`)
    const wavArrayBuffer = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer
    const dictionary = loadDictionary()
    const text = await transcribeAudio(wavArrayBuffer, dictionary)
    console.log(`[debug] texte transcrit (${text.length} caractères) : ${JSON.stringify(text)}`)
    if (settings.autoPaste && text.trim().length > 0) {
      await pasteIntoActiveWindow(text)
      console.log('[debug] pasteIntoActiveWindow termine')
    } else {
      console.log('[debug] pas de collage : autoPaste=', settings.autoPaste, 'texte vide=', text.trim().length === 0)
    }
  } catch (err) {
    console.error(err)
    setAppState('error')
    setTimeout(() => setAppState('idle'), 2000)
    return
  }
  setAppState('idle')
}

const HOTKEY_DEBOUNCE_MS = 400
let lastHotkeyTriggerAt = 0

function registerHotkey(): void {
  globalShortcut.unregisterAll()
  const ok = globalShortcut.register(settings.hotkey, () => {
    const now = Date.now()
    if (now - lastHotkeyTriggerAt < HOTKEY_DEBOUNCE_MS) {
      return
    }
    lastHotkeyTriggerAt = now
    console.log(`[debug] raccourci ${settings.hotkey} déclenché, état actuel : ${appState}`)
    void toggleDictation()
  })
  console.log(`[debug] enregistrement du raccourci ${settings.hotkey} : ${ok ? 'OK' : 'ECHEC'}`)
  if (!ok) {
    console.error(`Impossible d'enregistrer le raccourci ${settings.hotkey}`)
  }
}

function applyLaunchAtStartup(): void {
  if (!app.isPackaged) {
    return
  }
  app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
}

function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.IsPackaged, () => app.isPackaged)
  ipcMain.handle(IpcChannel.GetSettings, () => settings)
  ipcMain.handle(IpcChannel.SetSettings, (_event, next: DictationSettings) => {
    const previousPosition = settings.overlayPosition
    settings = next
    saveSettings(settings)
    registerHotkey()
    applyLaunchAtStartup()
    pushOverlayConfig()
    if (overlayWindow && next.overlayPosition !== previousPosition) {
      const { x, y } = overlayCoords(next.overlayPosition)
      overlayWindow.setPosition(x, y)
    }
  })
  ipcMain.handle(IpcChannel.GetDictionary, () => loadDictionary())
  ipcMain.handle(IpcChannel.SetDictionary, (_event, entries) => {
    saveDictionary(entries)
  })
  ipcMain.on(IpcChannel.RecordingStopped, (_event, audio: ArrayBuffer) => {
    void handleRecordingStopped(audio)
  })
  ipcMain.on(IpcChannel.RecordingError, (_event, message: string) => {
    console.error('[debug] erreur de capture micro :', message)
    setAppState('error')
    setTimeout(() => setAppState('idle'), 2500)
  })
  ipcMain.on(IpcChannel.AudioLevel, (_event, level: number) => {
    overlayWindow?.webContents.send(IpcChannel.AudioLevel, level)
  })
}

function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(trayIconPath('idle')))
  const menu = Menu.buildFromTemplate([
    { label: 'Démarrer / arrêter la dictée', click: () => void toggleDictation() },
    { label: 'Réglages', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quitter', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip('murmur : idle')
  tray.on('click', () => void toggleDictation())
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'media')

  registerIpcHandlers()
  createTray()
  recorderWindow = createRecorderWindow()
  overlayWindow = createOverlayWindow()
  registerHotkey()
  applyLaunchAtStartup()
  try {
    await ensureWhisperServer(settings.model)
  } catch (err) {
    console.error('Impossible de démarrer whisper-server au lancement :', err)
  }
})

app.on('window-all-closed', () => {
  // l'app reste active dans la barre système
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopWhisperServer()
})
