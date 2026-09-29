import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, type BrowserWindow } from 'electron'
import { IpcChannel } from '../shared/types'

interface ScreenshotTargets {
  outputDir: string
  settingsWindow: BrowserWindow
  overlayWindow: BrowserWindow
  showRecordingOverlay: () => void
}

const SETTINGS_SECTIONS: ReadonlyArray<{ section: string; fileName: string }> = [
  { section: 'home', fileName: 'screenshot-settings.png' },
  { section: 'shortcuts', fileName: 'screenshot-shortcuts.png' },
  { section: 'hands-free', fileName: 'screenshot-hands-free.png' }
]

export function prepareScreenshotSwitches(): void {
  app.commandLine.appendSwitch('use-fake-device-for-media-stream')
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
}

function wait(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function whenLoaded(window: BrowserWindow): Promise<void> {
  if (!window.webContents.isLoadingMainFrame()) {
    return Promise.resolve()
  }
  return new Promise((resolvePromise) => window.webContents.once('did-finish-load', () => resolvePromise()))
}

async function saveCapture(window: BrowserWindow, path: string): Promise<void> {
  const image = await window.webContents.capturePage()
  writeFileSync(path, image.toPNG())
}

export async function captureScreenshots(targets: ScreenshotTargets): Promise<void> {
  const { outputDir, settingsWindow, overlayWindow, showRecordingOverlay } = targets
  mkdirSync(outputDir, { recursive: true })

  await whenLoaded(settingsWindow)
  await wait(800)
  for (const { section, fileName } of SETTINGS_SECTIONS) {
    await settingsWindow.webContents.executeJavaScript(
      `document.querySelector('.nav-item[data-section="${section}"]').click()`
    )
    await wait(500)
    await saveCapture(settingsWindow, join(outputDir, fileName))
  }

  await whenLoaded(overlayWindow)
  showRecordingOverlay()
  const levels = [0.35, 0.6, 0.75, 0.55, 0.7]
  for (const level of levels) {
    overlayWindow.webContents.send(IpcChannel.AudioLevel, level)
    await wait(120)
  }
  await wait(300)
  await saveCapture(overlayWindow, join(outputDir, 'screenshot-overlay.png'))
}
