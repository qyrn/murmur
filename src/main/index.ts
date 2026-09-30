import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain, screen, session } from 'electron'
import { join } from 'node:path'
import { activeWindow } from 'get-windows'
import { initFileLogging } from './logger'
import { checkForUpdatesAtLaunch, checkForUpdatesManually } from './updater'
import {
  loadSettings,
  saveSettings,
  loadDictionary,
  saveDictionary,
  loadShortcuts,
  saveShortcuts
} from './settingsStore'
import { loadHistory, appendHistoryEntry } from './historyStore'
import { captureScreenshots, prepareScreenshotSwitches } from './screenshotMode'
import { watchFullscreenApps } from './fullscreenGuard'
import { ensureWhisperServer, stopWhisperServer } from './whisperServer'
import { transcribeAudio, transcribeHandsFreeAudio, transcribeVoiceCommand } from './transcribe'
import { containsStopPhrase, containsWakePhrase, soundsLikeMurmur } from './voiceCommands'
import { pasteIntoActiveWindow } from './textInjector'
import { convertToWav16kMono } from './audioConvert'
import {
  IpcChannel,
  type AppState,
  type DictationSettings,
  type HandsFreeActivity,
  type HandsFreeMode,
  type HandsFreeStatus,
  type OverlayPosition
} from '../shared/types'

initFileLogging()

if (process.env['MURMUR_SCREENSHOT']) {
  prepareScreenshotSwitches()
}

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
let fullscreenAppActive = false
let hotkeyRegistered = false
let handsFreeMode: HandsFreeMode = 'off'
let handsFreeDictating = false
let handsFreeHearing = false
let lastHeardCommand: string | null = null
let settings: DictationSettings = loadSettings()
let recordingStartedAt: number | null = null

const overlayVisibleStates: ReadonlySet<AppState> = new Set(['recording', 'transcribing', 'loading-model', 'error'])

const trayIconFor: Record<AppState, string> = {
  idle: 'idle.png',
  'loading-model': 'transcribing.png',
  recording: 'recording.png',
  transcribing: 'transcribing.png',
  error: 'error.png'
}

function resourcesRoot(): string {
  return app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')
}

function trayIconPath(): string {
  const fileName = appState === 'idle' && handsFreeMode === 'standby' ? 'listening.png' : trayIconFor[appState]
  return join(resourcesRoot(), 'tray', fileName)
}

function refreshTrayIcon(): void {
  tray?.setImage(nativeImage.createFromPath(trayIconPath()))
}

function appIconPath(): string {
  return join(resourcesRoot(), 'icon.ico')
}

function setAppState(state: AppState): void {
  console.log(`[debug] setAppState(${state})`)
  appState = state
  if (state === 'idle') {
    syncHotkeyWithFullscreen()
  }
  syncHandsFree()
  refreshTrayIcon()
  tray?.setToolTip(`murmur : ${state}`)
  overlayWindow?.webContents.send(IpcChannel.OverlayState, state)
  if (overlayVisibleStates.has(state)) {
    if (overlayWindow) {
      const { x, y } = overlayCoords(settings.overlayPosition)
      overlayWindow.setPosition(x, y)
      overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    }
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
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 'warning') {
      console.error(`[recorder] ${event.message}`)
    }
  })
  win.webContents.on('did-finish-load', () => syncHandsFree(true))
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
    width: 700,
    height: 780,
    title: 'Réglages — murmur',
    icon: appIconPath(),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
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
      recordingStartedAt = Date.now()
      recorderWindow?.webContents.send(IpcChannel.ToggleDictation, 'start')
    } catch (err) {
      console.error(err)
      setAppState('error')
      setTimeout(() => setAppState('idle'), 2000)
    }
    return
  }

  if (appState === 'recording') {
    const channel = handsFreeDictating ? IpcChannel.HandsFreeFinish : IpcChannel.ToggleDictation
    recorderWindow?.webContents.send(channel, 'stop')
  }
}

function desiredHandsFreeMode(): HandsFreeMode {
  return settings.handsFreeEnabled && !fullscreenAppActive && appState === 'idle' ? 'standby' : 'off'
}

function handsFreeActivity(): HandsFreeActivity {
  if (!settings.handsFreeEnabled) {
    return 'disabled'
  }
  if (handsFreeDictating) {
    return 'dictating'
  }
  if (handsFreeMode === 'off') {
    return 'paused'
  }
  return handsFreeHearing ? 'hearing' : 'standby'
}

function handsFreeStatus(): HandsFreeStatus {
  return { activity: handsFreeActivity(), lastHeard: lastHeardCommand }
}

function publishHandsFreeStatus(): void {
  settingsWindow?.webContents.send(IpcChannel.HandsFreeStatus, handsFreeStatus())
}

function syncHandsFree(force = false): void {
  if (handsFreeDictating) {
    return
  }
  const mode = desiredHandsFreeMode()
  if (mode === handsFreeMode && !force) {
    return
  }
  handsFreeMode = mode
  handsFreeHearing = false
  recorderWindow?.webContents.send(IpcChannel.HandsFreeMode, {
    mode,
    silenceSeconds: settings.handsFreeSilenceSeconds
  })
  refreshTrayIcon()
  publishHandsFreeStatus()
}

async function transcribeCommandSafely(wav: ArrayBuffer): Promise<string> {
  try {
    return (await transcribeVoiceCommand(wav)).trim()
  } catch (err) {
    console.error('[mains libres] transcription de commande impossible', err)
    return ''
  }
}

function logMissedCommand(command: 'start' | 'stop', heard: string): void {
  if (soundsLikeMurmur(heard)) {
    console.log(`[mains libres] murmur ${command} non reconnu dans : ${JSON.stringify(heard)}`)
  }
}

async function checkWakePhrase(wav: ArrayBuffer): Promise<boolean> {
  if (desiredHandsFreeMode() !== 'standby') {
    return false
  }
  const heard = await transcribeCommandSafely(wav)
  if (heard.length > 0) {
    lastHeardCommand = heard
    publishHandsFreeStatus()
  }
  if (!containsWakePhrase(heard)) {
    logMissedCommand('start', heard)
    return false
  }
  if (desiredHandsFreeMode() !== 'standby') {
    return false
  }
  console.log('[mains libres] murmur start entendu')
  handsFreeDictating = true
  recordingStartedAt = Date.now()
  setAppState('recording')
  publishHandsFreeStatus()
  return true
}

async function checkStopPhrase(wav: ArrayBuffer): Promise<boolean> {
  if (!handsFreeDictating) {
    return false
  }
  const heard = await transcribeCommandSafely(wav)
  const stopped = containsStopPhrase(heard)
  if (!stopped) {
    logMissedCommand('stop', heard)
  }
  return stopped
}

function handleRecordingStopped(audio: ArrayBuffer): Promise<void> {
  return completeDictation(async () => {
    console.log(`[debug] audio recu du renderer : ${audio.byteLength} octets`)
    const wav = await convertToWav16kMono(Buffer.from(audio))
    console.log(`[debug] wav converti : ${wav.byteLength} octets`)
    const wavArrayBuffer = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer
    return transcribeAudio(wavArrayBuffer, loadDictionary(), loadShortcuts())
  })
}

function handleHandsFreeAudio(wav: ArrayBuffer): Promise<void> {
  handsFreeDictating = false
  console.log(`[mains libres] audio recu : ${wav.byteLength} octets`)
  return completeDictation(() => transcribeHandsFreeAudio(wav, loadDictionary(), loadShortcuts()))
}

async function completeDictation(transcribe: () => Promise<string>): Promise<void> {
  try {
    setAppState('transcribing')
    const text = await transcribe()
    console.log(`[debug] texte transcrit (${text.length} caractères) : ${JSON.stringify(text)}`)

    const trimmed = text.trim()
    if (trimmed.length > 0) {
      const durationMs = recordingStartedAt ? Date.now() - recordingStartedAt : 0
      const appName = await activeWindow()
        .then((win) => win?.owner.name ?? 'Inconnue')
        .catch(() => 'Inconnue')
      appendHistoryEntry({
        timestamp: Date.now(),
        wordCount: trimmed.split(/\s+/).filter(Boolean).length,
        durationMs,
        appName,
        text: trimmed
      })
    }
    recordingStartedAt = null

    if (settings.autoPaste && trimmed.length > 0) {
      await pasteIntoActiveWindow(text)
      console.log('[debug] pasteIntoActiveWindow termine')
    } else {
      console.log('[debug] pas de collage : autoPaste=', settings.autoPaste, 'texte vide=', trimmed.length === 0)
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
  hotkeyRegistered = ok
  console.log(`[debug] enregistrement du raccourci ${settings.hotkey} : ${ok ? 'OK' : 'ECHEC'}`)
  if (!ok) {
    console.error(`Impossible d'enregistrer le raccourci ${settings.hotkey}`)
  }
}

function syncHotkeyWithFullscreen(): void {
  const blocked = settings.disableHotkeyInFullscreen && fullscreenAppActive && appState === 'idle'
  if (blocked && hotkeyRegistered) {
    globalShortcut.unregisterAll()
    hotkeyRegistered = false
    console.log('[debug] app plein écran au premier plan, raccourci libéré')
  } else if (!blocked && !hotkeyRegistered) {
    registerHotkey()
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
  ipcMain.handle(IpcChannel.GetAppVersion, () => app.getVersion())
  ipcMain.handle(IpcChannel.GetSettings, () => settings)
  ipcMain.handle(IpcChannel.SetSettings, (_event, next: DictationSettings) => {
    const previousPosition = settings.overlayPosition
    settings = next
    saveSettings(settings)
    registerHotkey()
    syncHotkeyWithFullscreen()
    syncHandsFree(true)
    publishHandsFreeStatus()
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
  ipcMain.handle(IpcChannel.GetShortcuts, () => loadShortcuts())
  ipcMain.handle(IpcChannel.SetShortcuts, (_event, shortcuts) => {
    saveShortcuts(shortcuts)
  })
  ipcMain.on(IpcChannel.RecordingStopped, (_event, audio: ArrayBuffer) => {
    void handleRecordingStopped(audio)
  })
  ipcMain.handle(IpcChannel.HandsFreeCheckWake, (_event, wav: ArrayBuffer) => checkWakePhrase(wav))
  ipcMain.handle(IpcChannel.HandsFreeCheckStop, (_event, wav: ArrayBuffer) => checkStopPhrase(wav))
  ipcMain.on(IpcChannel.HandsFreeAudio, (_event, wav: ArrayBuffer) => {
    void handleHandsFreeAudio(wav)
  })
  ipcMain.on(IpcChannel.HandsFreeHearing, (_event, hearing: boolean) => {
    handsFreeHearing = hearing
    publishHandsFreeStatus()
  })
  ipcMain.handle(IpcChannel.GetHandsFreeStatus, () => handsFreeStatus())
  ipcMain.on(IpcChannel.RecordingError, (_event, message: string) => {
    console.error('[debug] erreur de capture micro :', message)
    setAppState('error')
    setTimeout(() => setAppState('idle'), 2500)
  })
  ipcMain.on(IpcChannel.AudioLevel, (_event, level: number) => {
    overlayWindow?.webContents.send(IpcChannel.AudioLevel, level)
  })
  ipcMain.handle(IpcChannel.GetHistory, () => loadHistory())
  ipcMain.on(IpcChannel.WindowMinimize, () => settingsWindow?.minimize())
  ipcMain.on(IpcChannel.WindowToggleMaximize, () => {
    if (!settingsWindow) {
      return
    }
    if (settingsWindow.isMaximized()) {
      settingsWindow.unmaximize()
    } else {
      settingsWindow.maximize()
    }
  })
  ipcMain.on(IpcChannel.WindowClose, () => settingsWindow?.close())
}

function createTray(): void {
  tray = new Tray(nativeImage.createFromPath(trayIconPath()))
  const menu = Menu.buildFromTemplate([
    { label: 'Démarrer / arrêter la dictée', click: () => void toggleDictation() },
    { label: 'Réglages', click: () => createSettingsWindow() },
    { label: 'Réessayer de démarrer le moteur', click: () => void startWhisperServerAtLaunch() },
    { label: 'Vérifier les mises à jour', click: () => checkForUpdatesManually() },
    { type: 'separator' },
    { label: 'Quitter', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip('murmur : idle')
  tray.on('click', () => void toggleDictation())
}

const STARTUP_RETRY_DELAYS_MS = [2000, 4000, 8000, 15000]

async function startWhisperServerAtLaunch(): Promise<void> {
  for (let attempt = 0; attempt <= STARTUP_RETRY_DELAYS_MS.length; attempt++) {
    try {
      await ensureWhisperServer(settings.model)
      console.log(`[debug] whisper-server prêt (tentative ${attempt + 1})`)
      return
    } catch (err) {
      console.error(`[debug] échec démarrage whisper-server (tentative ${attempt + 1}) :`, err)
      const delay = STARTUP_RETRY_DELAYS_MS[attempt]
      if (delay === undefined) {
        console.error('[debug] abandon après plusieurs tentatives, réessai à la prochaine dictée ou manuellement')
        return
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, delay))
    }
  }
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
  watchFullscreenApps((active) => {
    fullscreenAppActive = active
    syncHotkeyWithFullscreen()
    syncHandsFree()
  })
  applyLaunchAtStartup()
  checkForUpdatesAtLaunch()
  const screenshotDir = process.env['MURMUR_SCREENSHOT']
  if (screenshotDir) {
    createSettingsWindow()
    if (settingsWindow && overlayWindow) {
      await captureScreenshots({
        outputDir: screenshotDir,
        settingsWindow,
        overlayWindow,
        showRecordingOverlay: () => setAppState('recording')
      })
      app.quit()
      return
    }
  }
  await startWhisperServerAtLaunch()
})

app.on('window-all-closed', () => undefined)

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopWhisperServer()
})
