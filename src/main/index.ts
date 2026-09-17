import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain, systemPreferences } from 'electron'
import { join } from 'node:path'
import { loadSettings, saveSettings, loadDictionary, saveDictionary } from './settingsStore'
import { ensureWhisperServer, stopWhisperServer } from './whisperServer'
import { transcribeAudio } from './transcribe'
import { pasteIntoActiveWindow } from './textInjector'
import { convertToWav16kMono } from './audioConvert'
import { IpcChannel, type AppState, type DictationSettings } from '../shared/types'

let tray: Tray | null = null
let recorderWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let appState: AppState = 'idle'
let settings: DictationSettings = loadSettings()

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
  appState = state
  tray?.setImage(nativeImage.createFromPath(trayIconPath(state)))
  tray?.setToolTip(`Dictée : ${state}`)
}

function createRecorderWindow(): BrowserWindow {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/recorder.js'),
      sandbox: false
    }
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/recorder/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/recorder/index.html'))
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
      preload: join(__dirname, '../preload/settings.js'),
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

function registerHotkey(): void {
  globalShortcut.unregisterAll()
  const ok = globalShortcut.register(settings.hotkey, () => {
    void toggleDictation()
  })
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
  registerIpcHandlers()
  createTray()
  recorderWindow = createRecorderWindow()
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
