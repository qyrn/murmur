import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain, systemPreferences, screen, session } from 'electron'
import { join } from 'node:path'
import { loadSettings, saveSettings, loadDictionary, saveDictionary } from './settingsStore'
import { ensureWhisperServer, stopWhisperServer } from './whisperServer'
import { transcribeAudio } from './transcribe'
import { pasteIntoActiveWindow } from './textInjector'
import { convertToWav16kMono } from './audioConvert'
import { IpcChannel, type AppState, type DictationSettings } from '../shared/types'

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
  tray?.setToolTip(`Dictée : ${state}`)
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

function createOverlayWindow(): BrowserWindow {
  const width = 220
  const height = 64
  const { workArea } = screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + workArea.height - height - 64),
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
    title: 'Réglages — Dictée',
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
    const wav = await convertToWav16kMono(Buffer.from(audio))
    const wavArrayBuffer = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer
    const dictionary = loadDictionary()
    const text = await transcribeAudio(wavArrayBuffer, dictionary)
    if (settings.autoPaste && text.trim().length > 0) {
      await pasteIntoActiveWindow(text)
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

function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.GetSettings, () => settings)
  ipcMain.handle(IpcChannel.SetSettings, (_event, next: DictationSettings) => {
    settings = next
    saveSettings(settings)
    registerHotkey()
  })
  ipcMain.handle(IpcChannel.GetDictionary, () => loadDictionary())
  ipcMain.handle(IpcChannel.SetDictionary, (_event, entries) => {
    saveDictionary(entries)
  })
  ipcMain.handle(IpcChannel.GetMicrophones, async () => {
    return systemPreferences.getMediaAccessStatus('microphone')
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
  tray.setToolTip('Dictée : idle')
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
